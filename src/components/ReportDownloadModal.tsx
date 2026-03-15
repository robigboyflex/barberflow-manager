import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Download, FileText, FileSpreadsheet, Calendar as CalendarIcon, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface Shop {
  id: string;
  name: string;
}

interface ReportDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  shops: Shop[];
  userId: string;
}

type TimePeriod = "day" | "week" | "month" | "quarter" | "year" | "custom";
type FileFormat = "pdf" | "excel" | "csv";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function ReportDownloadModal({
  isOpen,
  onClose,
  shops,
  userId,
}: ReportDownloadModalProps) {
  const [selectedShop, setSelectedShop] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [fileFormat, setFileFormat] = useState<FileFormat>("csv");
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRangeForPeriod = (period: TimePeriod) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case "day":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(now.getDate() - 7);
        break;
      case "month":
        start.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(now.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(now.getFullYear() - 1);
        break;
      case "custom":
        if (dateRange.from && dateRange.to) {
          const customStart = new Date(dateRange.from);
          customStart.setHours(0, 0, 0, 0);
          const customEnd = new Date(dateRange.to);
          customEnd.setHours(23, 59, 59, 999);
          return { start: customStart, end: customEnd };
        }
        return { start, end: now };
    }

    return { start, end: now };
  };

  const generateReport = async () => {
    if (timePeriod === "custom" && (!dateRange.from || !dateRange.to)) {
      toast.error("Please select both start and end dates");
      return;
    }

    setIsGenerating(true);

    try {
      const { start, end } = getDateRangeForPeriod(timePeriod);
      const shopIds = selectedShop === "all" ? shops.map((s) => s.id) : [selectedShop];

      if (shopIds.length === 0) {
        toast.error("No shops available");
        return;
      }

      // Fetch cuts data
      const { data: cutsData, error: cutsError } = await supabase
        .from("cuts")
        .select(`
          id,
          price,
          status,
          created_at,
          shop_id,
          shops!cuts_shop_id_fkey (name),
          staff!cuts_barber_id_fkey (name),
          services!cuts_service_id_fkey (name)
        `)
        .in("shop_id", shopIds)
        .in("status", ["confirmed", "pending"])
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (cutsError) throw cutsError;

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id,
          amount,
          description,
          category,
          expense_date,
          shop_id,
          shops!expenses_shop_id_fkey (name)
        `)
        .in("shop_id", shopIds)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (expensesError) throw expensesError;

      // Calculate summary
      const totalRevenue = cutsData
        ?.filter((c) => c.status === "confirmed")
        .reduce((sum, c) => sum + Number(c.price), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const totalCuts = cutsData?.filter((c) => c.status === "confirmed").length || 0;

      // Generate file based on format
      if (fileFormat === "csv") {
        generateCSV(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, start, end);
      } else if (fileFormat === "excel") {
        generateExcel(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, start, end);
      } else {
        generatePDF(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, start, end);
      }

      toast.success("Report downloaded successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error(error.message || "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCSV = (
    cuts: any[],
    expenses: any[],
    totalRevenue: number,
    totalExpenses: number,
    netProfit: number,
    totalCuts: number,
    start: Date,
    end: Date
  ) => {
    const periodLabel = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    
    let csv = "BarberFlow Revenue Report\n";
    csv += `Period: ${periodLabel}\n\n`;
    
    csv += "SUMMARY\n";
    csv += `Total Revenue,${formatCurrency(totalRevenue)}\n`;
    csv += `Total Expenses,${formatCurrency(totalExpenses)}\n`;
    csv += `Net Profit,${formatCurrency(netProfit)}\n`;
    csv += `Total Cuts,${totalCuts}\n\n`;
    
    csv += "CUTS DETAIL\n";
    csv += "Date,Shop,Barber,Service,Amount,Status\n";
    cuts.forEach((cut) => {
      const shop = cut.shops as any;
      const barber = cut.staff as any;
      const service = cut.services as any;
      csv += `${new Date(cut.created_at).toLocaleString()},${shop?.name || "N/A"},${barber?.name || "N/A"},${service?.name || "N/A"},${formatCurrency(Number(cut.price))},${cut.status}\n`;
    });
    
    csv += "\nEXPENSES DETAIL\n";
    csv += "Date,Shop,Category,Description,Amount\n";
    expenses.forEach((expense) => {
      const shop = expense.shops as any;
      csv += `${expense.expense_date},${shop?.name || "N/A"},${expense.category},${expense.description},${formatCurrency(Number(expense.amount))}\n`;
    });

    downloadFile(csv, `barberflow-report-${timePeriod}.csv`, "text/csv");
  };

  const generateExcel = (
    cuts: any[],
    expenses: any[],
    totalRevenue: number,
    totalExpenses: number,
    netProfit: number,
    totalCuts: number,
    start: Date,
    end: Date
  ) => {
    // Generate CSV with Excel-compatible encoding
    const periodLabel = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    
    let csv = "\uFEFF"; // BOM for Excel
    csv += "BarberFlow Revenue Report\n";
    csv += `Period: ${periodLabel}\n\n`;
    
    csv += "SUMMARY\n";
    csv += `Total Revenue\t${formatCurrency(totalRevenue)}\n`;
    csv += `Total Expenses\t${formatCurrency(totalExpenses)}\n`;
    csv += `Net Profit\t${formatCurrency(netProfit)}\n`;
    csv += `Total Cuts\t${totalCuts}\n\n`;
    
    csv += "CUTS DETAIL\n";
    csv += "Date\tShop\tBarber\tService\tAmount\tStatus\n";
    cuts.forEach((cut) => {
      const shop = cut.shops as any;
      const barber = cut.staff as any;
      const service = cut.services as any;
      csv += `${new Date(cut.created_at).toLocaleString()}\t${shop?.name || "N/A"}\t${barber?.name || "N/A"}\t${service?.name || "N/A"}\t${Number(cut.price).toFixed(2)}\t${cut.status}\n`;
    });
    
    csv += "\nEXPENSES DETAIL\n";
    csv += "Date\tShop\tCategory\tDescription\tAmount\n";
    expenses.forEach((expense) => {
      const shop = expense.shops as any;
      csv += `${expense.expense_date}\t${shop?.name || "N/A"}\t${expense.category}\t${expense.description}\t${Number(expense.amount).toFixed(2)}\n`;
    });

    downloadFile(csv, `barberflow-report-${timePeriod}.xls`, "application/vnd.ms-excel");
  };

  const generatePDF = (
    cuts: any[],
    expenses: any[],
    totalRevenue: number,
    totalExpenses: number,
    netProfit: number,
    totalCuts: number,
    start: Date,
    end: Date
  ) => {
    const periodLabel = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

    // Calculate barber breakdown for the report
    const barberMap = new Map<string, { name: string; cuts: number; revenue: number }>();
    cuts.forEach(cut => {
      if (cut.status !== "confirmed") return;
      const barber = cut.staff as any;
      const name = barber?.name || "Unknown";
      const existing = barberMap.get(name);
      if (existing) {
        existing.cuts++;
        existing.revenue += Number(cut.price);
      } else {
        barberMap.set(name, { name, cuts: 1, revenue: Number(cut.price) });
      }
    });
    const barberBreakdown = Array.from(barberMap.values()).sort((a, b) => b.cuts - a.cuts);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>BarberFlow Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; background: #f8f9fa; color: #1a1a2e; }
    .header { background: linear-gradient(135deg, #d4a048, #c4922a); color: #fff; padding: 40px; }
    .header h1 { font-size: 28px; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
    .header p { opacity: 0.85; font-size: 14px; }
    .container { max-width: 800px; margin: 0 auto; padding: 0 20px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: -30px 20px 30px; position: relative; z-index: 1; }
    .summary-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); text-align: center; }
    .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
    .summary-card .value { font-size: 22px; font-weight: 800; }
    .summary-card .value.revenue { color: #22c55e; }
    .summary-card .value.expense { color: #ef4444; }
    .summary-card .value.profit { color: ${netProfit >= 0 ? '#22c55e' : '#ef4444'}; }
    .summary-card .value.cuts { color: #d4a048; }
    .section { background: #fff; border-radius: 12px; margin: 20px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .section h2 { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .section h2::before { content: ''; width: 4px; height: 20px; background: #d4a048; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-weight: 600; color: #555; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    tr:last-child td { border-bottom: none; }
    .total-row { background: #fef9ee; font-weight: 700; }
    .total-row td { border-top: 2px solid #d4a048; color: #1a1a2e; }
    .barber-rank { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .rank-1 { background: linear-gradient(135deg, #fbbf24, #d97706); color: #fff; }
    .rank-2 { background: linear-gradient(135deg, #d1d5db, #9ca3af); color: #fff; }
    .rank-3 { background: linear-gradient(135deg, #f97316, #c2410c); color: #fff; }
    .rank-other { background: #f3f4f6; color: #6b7280; }
    .footer { text-align: center; padding: 20px; font-size: 11px; color: #999; }
    @media print { body { background: #fff; } .section { box-shadow: none; border: 1px solid #eee; } .summary-grid { margin-top: -20px; } .summary-card { box-shadow: none; border: 1px solid #eee; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>📊 BarberFlow Report</h1>
      <p>Period: ${periodLabel}</p>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Revenue</div>
      <div class="value revenue">${formatCurrency(totalRevenue)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Expenses</div>
      <div class="value expense">${formatCurrency(totalExpenses)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Net Profit</div>
      <div class="value profit">${formatCurrency(netProfit)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Cuts</div>
      <div class="value cuts">${totalCuts}</div>
    </div>
  </div>

  ${barberBreakdown.length > 0 ? `
  <div class="section">
    <h2>Barber Performance</h2>
    <table>
      <tr><th>Rank</th><th>Barber</th><th>Cuts</th><th>Revenue</th></tr>
      ${barberBreakdown.map((b, i) => `
        <tr>
          <td><span class="barber-rank ${i < 3 ? `rank-${i + 1}` : 'rank-other'}">${i + 1}</span></td>
          <td>${b.name}</td>
          <td>${b.cuts}</td>
          <td>${formatCurrency(b.revenue)}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>Total</strong></td>
        <td><strong>${barberBreakdown.reduce((s, b) => s + b.cuts, 0)}</strong></td>
        <td><strong>${formatCurrency(barberBreakdown.reduce((s, b) => s + b.revenue, 0))}</strong></td>
      </tr>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>Cuts Detail</h2>
    <table>
      <tr><th>Date</th><th>Shop</th><th>Barber</th><th>Service</th><th>Amount</th><th>Status</th></tr>
      ${cuts.map((cut) => {
        const shop = cut.shops as any;
        const barber = cut.staff as any;
        const service = cut.services as any;
        return `<tr>
          <td>${new Date(cut.created_at).toLocaleString()}</td>
          <td>${shop?.name || "N/A"}</td>
          <td>${barber?.name || "N/A"}</td>
          <td>${service?.name || "N/A"}</td>
          <td>${formatCurrency(Number(cut.price))}</td>
          <td>${cut.status}</td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>Total (${totalCuts} confirmed cuts)</strong></td>
        <td><strong>${formatCurrency(totalRevenue)}</strong></td>
        <td></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Expenses Detail</h2>
    <table>
      <tr><th>Date</th><th>Shop</th><th>Category</th><th>Description</th><th>Amount</th></tr>
      ${expenses.map((expense) => {
        const shop = expense.shops as any;
        return `<tr>
          <td>${expense.expense_date}</td>
          <td>${shop?.name || "N/A"}</td>
          <td>${expense.category}</td>
          <td>${expense.description}</td>
          <td>${formatCurrency(Number(expense.amount))}</td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td colspan="4"><strong>Total Expenses</strong></td>
        <td><strong>${formatCurrency(totalExpenses)}</strong></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Generated by BarberFlow • ${new Date().toLocaleString()}
  </div>
</body>
</html>`;

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed inset-x-4 bottom-4 bg-card rounded-3xl border border-border shadow-2xl max-h-[80vh] overflow-y-auto"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Download Report</h2>
              <p className="text-sm text-muted-foreground">Revenue & Sales Report</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Shop</Label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time Period</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "quarter", label: "Quarter" },
                  { value: "year", label: "Year" },
                  { value: "custom", label: "Custom" },
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTimePeriod(option.value as TimePeriod)}
                    className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                      timePeriod === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Picker */}
            <AnimatePresence>
              {timePeriod === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label>Select Date Range</Label>
                  <div className="flex gap-3">
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 h-12 rounded-xl justify-start text-left font-normal",
                            !dateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start" sideOffset={5}>
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                          disabled={(date) => date > new Date() || (dateRange.to ? date > dateRange.to : false)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 h-12 rounded-xl justify-start text-left font-normal",
                            !dateRange.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[200]" align="start" sideOffset={5}>
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                          disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
                          initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label>File Format</Label>
              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFileFormat("pdf")}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                    fileFormat === "pdf"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <FileText className="w-6 h-6" />
                  <span className="text-sm font-medium">PDF</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFileFormat("excel")}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                    fileFormat === "excel"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <FileSpreadsheet className="w-6 h-6" />
                  <span className="text-sm font-medium">Excel</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFileFormat("csv")}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl transition-colors ${
                    fileFormat === "csv"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <File className="w-6 h-6" />
                  <span className="text-sm font-medium">CSV</span>
                </motion.button>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full h-12 rounded-xl bg-gradient-gold text-primary-foreground font-semibold gap-2"
            >
              {isGenerating ? (
                "Generating..."
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Report
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
