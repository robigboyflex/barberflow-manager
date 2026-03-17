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

interface BarberBreakdownItem {
  name: string;
  cuts: number;
  revenue: number;
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

  const getBarberBreakdown = (cuts: any[]): BarberBreakdownItem[] => {
    const map = new Map<string, BarberBreakdownItem>();
    cuts.forEach(cut => {
      if (cut.status !== "confirmed") return;
      const barber = cut.staff as any;
      const name = barber?.name || "Unknown";
      const existing = map.get(name);
      if (existing) { existing.cuts++; existing.revenue += Number(cut.price); }
      else { map.set(name, { name, cuts: 1, revenue: Number(cut.price) }); }
    });
    return Array.from(map.values()).sort((a, b) => b.cuts - a.cuts);
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
          id, price, status, created_at, shop_id,
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
          id, amount, description, category, expense_date, shop_id,
          shops!expenses_shop_id_fkey (name)
        `)
        .in("shop_id", shopIds)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      if (expensesError) throw expensesError;

      const totalRevenue = cutsData?.filter((c) => c.status === "confirmed").reduce((sum, c) => sum + Number(c.price), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const totalCuts = cutsData?.filter((c) => c.status === "confirmed").length || 0;
      const periodLabel = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      const barberBreakdown = getBarberBreakdown(cutsData || []);

      if (fileFormat === "csv") {
        generateCSV(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, periodLabel, barberBreakdown);
      } else if (fileFormat === "excel") {
        generateExcel(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, periodLabel, barberBreakdown);
      } else {
        await generatePDF(cutsData || [], expensesData || [], totalRevenue, totalExpenses, netProfit, totalCuts, periodLabel, barberBreakdown);
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

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    // Delayed click for mobile Safari compatibility
    setTimeout(() => {
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 2000);
    }, 100);
  };

  const generateCSV = (
    cuts: any[], expenses: any[],
    totalRevenue: number, totalExpenses: number, netProfit: number, totalCuts: number,
    periodLabel: string, barberBreakdown: BarberBreakdownItem[]
  ) => {
    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    let csv = "BarberFlow Revenue Report\n";
    csv += `Period:,${escapeCSV(periodLabel)}\n\n`;
    csv += "SUMMARY\n";
    csv += `Total Revenue,${totalRevenue.toFixed(2)}\n`;
    csv += `Total Expenses,${totalExpenses.toFixed(2)}\n`;
    csv += `Net Profit,${netProfit.toFixed(2)}\n`;
    csv += `Total Cuts,${totalCuts}\n\n`;

    csv += "BARBER PERFORMANCE\n";
    csv += "Rank,Barber,Cuts,Revenue\n";
    barberBreakdown.forEach((b, i) => {
      csv += `${i + 1},${escapeCSV(b.name)},${b.cuts},${b.revenue.toFixed(2)}\n`;
    });
    csv += `,,${barberBreakdown.reduce((s, b) => s + b.cuts, 0)},${barberBreakdown.reduce((s, b) => s + b.revenue, 0).toFixed(2)}\n\n`;

    csv += "CUTS DETAIL\n";
    csv += "Date,Shop,Barber,Service,Amount,Status\n";
    cuts.forEach((cut) => {
      csv += `${escapeCSV(new Date(cut.created_at).toLocaleString())},${escapeCSV((cut.shops as any)?.name || "N/A")},${escapeCSV((cut.staff as any)?.name || "N/A")},${escapeCSV((cut.services as any)?.name || "N/A")},${Number(cut.price).toFixed(2)},${cut.status}\n`;
    });
    csv += `,,,,${totalRevenue.toFixed(2)},Total (${totalCuts} cuts)\n\n`;

    csv += "EXPENSES DETAIL\n";
    csv += "Date,Shop,Category,Description,Amount\n";
    expenses.forEach((e) => {
      csv += `${e.expense_date},${escapeCSV((e.shops as any)?.name || "N/A")},${escapeCSV(e.category)},${escapeCSV(e.description)},${Number(e.amount).toFixed(2)}\n`;
    });
    csv += `,,,,${totalExpenses.toFixed(2)}\n`;

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `barberflow-report-${timePeriod}.csv`);
  };

  const generateExcel = (
    cuts: any[], expenses: any[],
    totalRevenue: number, totalExpenses: number, netProfit: number, totalCuts: number,
    periodLabel: string, barberBreakdown: BarberBreakdownItem[]
  ) => {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["BarberFlow Revenue Report"],
        ["Period", periodLabel],
        [],
        ["Metric", "Value"],
        ["Total Revenue", totalRevenue],
        ["Total Expenses", totalExpenses],
        ["Net Profit", netProfit],
        ["Total Cuts", totalCuts],
      ];
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      summaryWS["!cols"] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

      // Barber Performance sheet
      const barberData = [
        ["Rank", "Barber", "Cuts", "Revenue"],
        ...barberBreakdown.map((b, i) => [i + 1, b.name, b.cuts, b.revenue]),
        ["", "Total", barberBreakdown.reduce((s, b) => s + b.cuts, 0), barberBreakdown.reduce((s, b) => s + b.revenue, 0)],
      ];
      const barberWS = XLSX.utils.aoa_to_sheet(barberData);
      barberWS["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 8 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, barberWS, "Barber Performance");

      // Cuts Detail sheet
      const cutsRows = cuts.map((cut) => [
        new Date(cut.created_at).toLocaleString(),
        (cut.shops as any)?.name || "N/A",
        (cut.staff as any)?.name || "N/A",
        (cut.services as any)?.name || "N/A",
        Number(cut.price),
        cut.status,
      ]);
      cutsRows.push(["", "", "", `Total (${totalCuts} cuts)`, totalRevenue, ""]);
      const cutsWS = XLSX.utils.aoa_to_sheet([
        ["Date", "Shop", "Barber", "Service", "Amount", "Status"],
        ...cutsRows,
      ]);
      cutsWS["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, cutsWS, "Cuts Detail");

      // Expenses Detail sheet
      const expenseRows = expenses.map((e) => [
        e.expense_date,
        (e.shops as any)?.name || "N/A",
        e.category,
        e.description,
        Number(e.amount),
      ]);
      expenseRows.push(["", "", "", "Total", totalExpenses]);
      const expensesWS = XLSX.utils.aoa_to_sheet([
        ["Date", "Shop", "Category", "Description", "Amount"],
        ...expenseRows,
      ]);
      expensesWS["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, expensesWS, "Expenses Detail");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      triggerDownload(blob, `barberflow-report-${timePeriod}.xlsx`);
    });
  };

  const generatePDF = async (
    cuts: any[], expenses: any[],
    totalRevenue: number, totalExpenses: number, netProfit: number, totalCuts: number,
    periodLabel: string, barberBreakdown: BarberBreakdownItem[]
  ) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > 280) {
        doc.addPage();
        y = 15;
      }
    };

    // Header band
    doc.setFillColor(212, 160, 72);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BarberFlow Report", margin, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${periodLabel}`, margin, 28);
    y = 45;

    // Summary cards
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    const cardW = contentWidth / 4 - 3;
    const summaryItems = [
      { label: "Revenue", value: formatCurrency(totalRevenue), color: [34, 197, 94] },
      { label: "Expenses", value: formatCurrency(totalExpenses), color: [239, 68, 68] },
      { label: "Net Profit", value: formatCurrency(netProfit), color: netProfit >= 0 ? [34, 197, 94] : [239, 68, 68] },
      { label: "Total Cuts", value: String(totalCuts), color: [212, 160, 72] },
    ];

    summaryItems.forEach((item, i) => {
      const x = margin + i * (cardW + 4);
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, y, cardW, 22, 2, 2, "F");
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(7);
      doc.text(item.label.toUpperCase(), x + cardW / 2, y + 8, { align: "center" });
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, x + cardW / 2, y + 17, { align: "center" });
      doc.setFont("helvetica", "normal");
    });
    y += 32;

    // Barber Performance
    if (barberBreakdown.length > 0) {
      checkPage(20 + barberBreakdown.length * 8);
      doc.setFillColor(212, 160, 72);
      doc.rect(margin, y, 3, 7, "F");
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Barber Performance", margin + 6, y + 6);
      y += 12;

      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("RANK", margin + 3, y + 5.5);
      doc.text("BARBER", margin + 22, y + 5.5);
      doc.text("CUTS", margin + 100, y + 5.5);
      doc.text("REVENUE", margin + 130, y + 5.5);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      barberBreakdown.forEach((b, i) => {
        checkPage(8);
        const medals = ["🥇", "🥈", "🥉"];
        doc.setFontSize(9);
        doc.text(i < 3 ? medals[i] : String(i + 1), margin + 5, y + 4);
        doc.text(b.name, margin + 22, y + 4);
        doc.text(String(b.cuts), margin + 103, y + 4);
        doc.text(formatCurrency(b.revenue), margin + 130, y + 4);
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, y + 6, margin + contentWidth, y + 6);
        y += 8;
      });

      // Total row
      doc.setFillColor(254, 249, 238);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text("Total", margin + 22, y + 5.5);
      doc.text(String(barberBreakdown.reduce((s, b) => s + b.cuts, 0)), margin + 103, y + 5.5);
      doc.text(formatCurrency(barberBreakdown.reduce((s, b) => s + b.revenue, 0)), margin + 130, y + 5.5);
      y += 14;
    }

    // Cuts Detail
    checkPage(25);
    doc.setFillColor(212, 160, 72);
    doc.rect(margin, y, 3, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Cuts Detail", margin + 6, y + 6);
    y += 12;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DATE", margin + 2, y + 5.5);
    doc.text("SHOP", margin + 38, y + 5.5);
    doc.text("BARBER", margin + 70, y + 5.5);
    doc.text("SERVICE", margin + 100, y + 5.5);
    doc.text("AMOUNT", margin + 135, y + 5.5);
    doc.text("STATUS", margin + 160, y + 5.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7);
    cuts.forEach((cut) => {
      checkPage(7);
      doc.text(new Date(cut.created_at).toLocaleDateString(), margin + 2, y + 4);
      doc.text(((cut.shops as any)?.name || "N/A").substring(0, 15), margin + 38, y + 4);
      doc.text(((cut.staff as any)?.name || "N/A").substring(0, 15), margin + 70, y + 4);
      doc.text(((cut.services as any)?.name || "N/A").substring(0, 15), margin + 100, y + 4);
      doc.text(formatCurrency(Number(cut.price)), margin + 135, y + 4);
      doc.text(cut.status, margin + 160, y + 4);
      doc.setDrawColor(245, 245, 245);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);
      y += 7;
    });

    // Cuts total
    doc.setFillColor(254, 249, 238);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(`Total (${totalCuts} confirmed cuts)`, margin + 2, y + 5.5);
    doc.text(formatCurrency(totalRevenue), margin + 135, y + 5.5);
    y += 14;

    // Expenses Detail
    checkPage(25);
    doc.setFillColor(212, 160, 72);
    doc.rect(margin, y, 3, 7, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Expenses Detail", margin + 6, y + 6);
    y += 12;

    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DATE", margin + 2, y + 5.5);
    doc.text("SHOP", margin + 30, y + 5.5);
    doc.text("CATEGORY", margin + 65, y + 5.5);
    doc.text("DESCRIPTION", margin + 100, y + 5.5);
    doc.text("AMOUNT", margin + 155, y + 5.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(7);
    expenses.forEach((e) => {
      checkPage(7);
      doc.text(e.expense_date, margin + 2, y + 4);
      doc.text(((e.shops as any)?.name || "N/A").substring(0, 15), margin + 30, y + 4);
      doc.text(e.category.substring(0, 12), margin + 65, y + 4);
      doc.text(e.description.substring(0, 25), margin + 100, y + 4);
      doc.text(formatCurrency(Number(e.amount)), margin + 155, y + 4);
      doc.setDrawColor(245, 245, 245);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);
      y += 7;
    });

    // Expenses total
    doc.setFillColor(254, 249, 238);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text("Total Expenses", margin + 2, y + 5.5);
    doc.text(formatCurrency(totalExpenses), margin + 155, y + 5.5);
    y += 14;

    // Footer
    checkPage(10);
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated by BarberFlow • ${new Date().toLocaleString()}`, pageWidth / 2, y + 4, { align: "center" });

    // Save as blob and trigger download (mobile-compatible)
    const pdfBlob = doc.output("blob");
    triggerDownload(pdfBlob, `barberflow-report-${timePeriod}.pdf`);
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
