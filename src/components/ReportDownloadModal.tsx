import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { X, Download, FileText, FileSpreadsheet, Calendar as CalendarIcon } from "lucide-react";
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
    
    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>BarberFlow Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #d4a048; border-bottom: 2px solid #d4a048; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
    .summary-item { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .summary-item label { font-size: 12px; color: #666; }
    .summary-item value { font-size: 24px; font-weight: bold; color: #333; display: block; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; font-weight: bold; }
    .profit { color: ${netProfit >= 0 ? '#22c55e' : '#ef4444'}; }
  </style>
</head>
<body>
  <h1>BarberFlow Revenue Report</h1>
  <p>Period: ${periodLabel}</p>
  
  <div class="summary">
    <div class="summary-item">
      <label>Total Revenue</label>
      <value>${formatCurrency(totalRevenue)}</value>
    </div>
    <div class="summary-item">
      <label>Total Expenses</label>
      <value>${formatCurrency(totalExpenses)}</value>
    </div>
    <div class="summary-item">
      <label>Net Profit</label>
      <value class="profit">${formatCurrency(netProfit)}</value>
    </div>
    <div class="summary-item">
      <label>Total Cuts</label>
      <value>${totalCuts}</value>
    </div>
  </div>
  
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
  </table>
  
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
  </table>
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
            {timePeriod === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label>Select Date Range</Label>
                <div className="flex gap-3">
                  <Popover>
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
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                        disabled={(date) => date > new Date() || (dateRange.to ? date > dateRange.to : false)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
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
                    <PopoverContent className="w-auto p-0 z-[100]" align="start">
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
                  <Calendar className="w-6 h-6" />
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
