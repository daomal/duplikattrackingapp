import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { Shipment } from "@/lib/types";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface ExportOptionsProps {
  data: Shipment[];
}

const ExportOptions: React.FC<ExportOptionsProps> = ({ data }) => {
  // Function to get formatted today's date
  const getTodayFormatted = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };
  
  // Function to export as CSV
  const exportAsCSV = () => {
    try {
      // Define the CSV headers
      const headers = [
        "No. Surat Jalan",
        "Perusahaan",
        "Tujuan",
        "Supir",
        "Tanggal Kirim",
        "Tanggal Tiba",
        "Waktu Tiba",
        "Status",
        "Kendala",
        "Qty"
      ].join(",");
      
      // Convert data to CSV rows
      const csvRows = data.map((shipment) => {
        return [
          `"${shipment.noSuratJalan}"`,
          `"${shipment.perusahaan}"`,
          `"${shipment.tujuan}"`,
          `"${shipment.supir}"`,
          `"${shipment.tanggalKirim}"`,
          `"${shipment.tanggalTiba || ""}"`,
          `"${shipment.waktuTiba || ""}"`,
          `"${shipment.status}"`,
          `"${shipment.kendala || ""}"`,
          `${shipment.qty}`
        ].join(",");
      });
      
      // Combine headers and rows
      const csvContent = [headers, ...csvRows].join("\n");
      
      // Create a Blob with the CSV data
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create a link element to download the blob
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `pengiriman_${getTodayFormatted()}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Berhasil mengunduh file CSV");
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Gagal mengunduh file. Silakan coba lagi.");
    }
  };

  // Function to export as PDF
  const exportAsPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text("Laporan Data Pengiriman", 14, 22);
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);

      // Add filter range if available
      const urlParams = new URLSearchParams(window.location.search);
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');
      if (startDate && endDate) {
        doc.text(`Periode: ${startDate} s/d ${endDate}`, 14, 38);
      }
      
      // Prepare data for table
      const tableColumn = ["No. SJ", "Perusahaan", "Tujuan", "Supir", "Tgl Kirim", "Tgl Tiba", "Waktu Tiba", "Status", "Kendala", "Qty"];
      const tableRows = data.map((shipment) => [
        shipment.noSuratJalan,
        shipment.perusahaan,
        shipment.tujuan,
        shipment.supir,
        shipment.tanggalKirim,
        shipment.tanggalTiba || "-",
        shipment.waktuTiba || "-",
        shipment.status,
        shipment.kendala || "-",
        shipment.qty.toString()
      ]);

      // Calculate total quantity
      const totalQty = data.reduce((sum, item) => sum + item.qty, 0);

      // Create the table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 45,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 45 }
      });
      
      // Add total row
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.text(`Total Qty: ${totalQty}`, 167, finalY + 10, { align: 'right' });
      
      // Save the PDF
      doc.save(`pengiriman_${getTodayFormatted()}.pdf`);
      
      toast.success("Berhasil mengunduh file PDF");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Gagal mengunduh file PDF. Silakan coba lagi.");
    }
  };
  
  // Export grouped by company
  const exportGroupedByCompany = () => {
    try {
      // Group data by company
      const groupedByCompany = data.reduce((acc, shipment) => {
        const company = shipment.perusahaan;
        if (!acc[company]) {
          acc[company] = [];
        }
        acc[company].push(shipment);
        return acc;
      }, {} as Record<string, Shipment[]>);
      
      // For each company create a section in the CSV
      const sections: string[] = [];
      
      // Add headers first
      const headers = [
        "No. Surat Jalan",
        "Tujuan",
        "Supir",
        "Tanggal Kirim",
        "Tanggal Tiba",
        "Waktu Tiba",
        "Status",
        "Kendala",
        "Qty"
      ].join(",");
      
      Object.entries(groupedByCompany).forEach(([company, shipments]) => {
        // Add company name as a section header
        sections.push(`"${company}"`);
        sections.push(headers);
        
        // Add the shipments for this company
        shipments.forEach(shipment => {
          const row = [
            `"${shipment.noSuratJalan}"`,
            `"${shipment.tujuan}"`,
            `"${shipment.supir}"`,
            `"${shipment.tanggalKirim}"`,
            `"${shipment.tanggalTiba || ""}"`,
            `"${shipment.waktuTiba || ""}"`,
            `"${shipment.status}"`,
            `"${shipment.kendala || ""}"`,
            `${shipment.qty}`
          ].join(",");
          sections.push(row);
        });
        
        // Add an empty line between companies
        sections.push("");
      });
      
      const csvContent = sections.join("\n");
      
      // Create a Blob with the CSV data
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create a link element to download the blob
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `pengiriman_per_perusahaan_${getTodayFormatted()}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Berhasil mengunduh file CSV per perusahaan");
    } catch (error) {
      console.error("Error exporting CSV by company:", error);
      toast.error("Gagal mengunduh file. Silakan coba lagi.");
    }
  };

  // Export grouped by company as PDF
  const exportGroupedByCompanyPDF = () => {
    try {
      // Group data by company
      const groupedByCompany = data.reduce((acc, shipment) => {
        const company = shipment.perusahaan;
        if (!acc[company]) {
          acc[company] = [];
        }
        acc[company].push(shipment);
        return acc;
      }, {} as Record<string, Shipment[]>);
      
      const doc = new jsPDF();
      let yPos = 14;
      
      // Add title
      doc.setFontSize(18);
      doc.text("Laporan Data Pengiriman Per Perusahaan", 14, yPos);
      yPos += 8;
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, yPos);
      yPos += 10;
      
      const tableColumn = ["No. SJ", "Tujuan", "Supir", "Tgl Kirim", "Tgl Tiba", "Waktu Tiba", "Status", "Kendala", "Qty"];
      
      // Create pages for each company
      Object.entries(groupedByCompany).forEach(([company, shipments], index) => {
        if (index > 0) {
          doc.addPage();
          yPos = 14;
        }
        
        // Add company name as header
        doc.setFontSize(14);
        doc.text(`Perusahaan: ${company}`, 14, yPos);
        yPos += 6;
        
        const tableRows = shipments.map((shipment) => [
          shipment.noSuratJalan,
          shipment.tujuan,
          shipment.supir,
          shipment.tanggalKirim,
          shipment.tanggalTiba || "-",
          shipment.waktuTiba || "-",
          shipment.status,
          shipment.kendala || "-",
          shipment.qty.toString()
        ]);
        
        // Calculate total quantity for this company
        const companyTotal = shipments.reduce((sum, shipment) => sum + shipment.qty, 0);
        
        // Create the table
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: yPos,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 35 }
        });
        
        // Add total row for this company
        yPos = (doc as any).lastAutoTable.finalY + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total Qty: ${companyTotal}`, 167, yPos, { align: 'right' });
        
        // Update position for next company
        yPos += 10;
      });
      
      // Save the PDF
      doc.save(`pengiriman_per_perusahaan_${getTodayFormatted()}.pdf`);
      
      toast.success("Berhasil mengunduh file PDF per perusahaan");
    } catch (error) {
      console.error("Error exporting PDF by company:", error);
      toast.error("Gagal mengunduh file PDF. Silakan coba lagi.");
    }
  };
  
  // Export summary statistics
  const exportSummaryStats = () => {
    try {
      // Group data by company and calculate stats
      const companyStats = data.reduce((acc, shipment) => {
        const company = shipment.perusahaan;
        if (!acc[company]) {
          acc[company] = {
            name: company,
            total: 0,
            delivered: 0,
            pending: 0,
            failed: 0,
            totalQty: 0
          };
        }
        
        acc[company].total++;
        acc[company].totalQty += shipment.qty;
        
        if (shipment.status === "terkirim") {
          acc[company].delivered++;
        } else if (shipment.status === "tertunda") {
          acc[company].pending++;
        } else if (shipment.status === "gagal") {
          acc[company].failed++;
        }
        
        return acc;
      }, {} as Record<string, { name: string; total: number; delivered: number; pending: number; failed: number; totalQty: number }>);
      
      // Headers for the summary stats
      const headers = ["Perusahaan", "Total", "Terkirim", "Tertunda", "Gagal", "Total Qty"].join(",");
      
      // Convert stats to rows
      const statRows = Object.values(companyStats).map(stat => {
        return [
          `"${stat.name}"`,
          stat.total,
          stat.delivered,
          stat.pending,
          stat.failed,
          stat.totalQty
        ].join(",");
      });
      
      const csvContent = [headers, ...statRows].join("\n");
      
      // Create a Blob with the CSV data
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Create a link element to download the blob
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `statistik_pengiriman_${getTodayFormatted()}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Berhasil mengunduh statistik pengiriman");
    } catch (error) {
      console.error("Error exporting statistics:", error);
      toast.error("Gagal mengunduh statistik. Silakan coba lagi.");
    }
  };
  
  // Export summary statistics as PDF
  const exportSummaryStatsPDF = () => {
    try {
      // Group data by company and calculate stats
      const companyStats = data.reduce((acc, shipment) => {
        const company = shipment.perusahaan;
        if (!acc[company]) {
          acc[company] = {
            name: company,
            total: 0,
            delivered: 0,
            pending: 0,
            failed: 0,
            totalQty: 0
          };
        }
        
        acc[company].total++;
        acc[company].totalQty += shipment.qty;
        
        if (shipment.status === "terkirim") {
          acc[company].delivered++;
        } else if (shipment.status === "tertunda") {
          acc[company].pending++;
        } else if (shipment.status === "gagal") {
          acc[company].failed++;
        }
        
        return acc;
      }, {} as Record<string, { name: string; total: number; delivered: number; pending: number; failed: number; totalQty: number }>);
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text("Statistik Pengiriman", 14, 22);
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 30);
      
      // Prepare data for table
      const tableColumn = ["Perusahaan", "Total", "Terkirim", "Tertunda", "Gagal", "Total Qty"];
      const tableRows = Object.values(companyStats).map(stat => [
        stat.name,
        stat.total.toString(),
        stat.delivered.toString(),
        stat.pending.toString(),
        stat.failed.toString(),
        stat.totalQty.toString()
      ]);
      
      // Create the table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 35 }
      });
      
      // Save the PDF
      doc.save(`statistik_pengiriman_${getTodayFormatted()}.pdf`);
      
      toast.success("Berhasil mengunduh statistik pengiriman dalam bentuk PDF");
    } catch (error) {
      console.error("Error exporting PDF statistics:", error);
      toast.error("Gagal mengunduh statistik PDF. Silakan coba lagi.");
    }
  };
  
  // Export complete report with charts as PDF
  const exportCompleteReportPDF = async () => {
    try {
      toast.info("Sedang menyiapkan laporan lengkap...");
      
      // Get chart elements
      const chartElements = document.querySelectorAll('.chart-container');
      if (!chartElements.length) {
        toast.error("Tidak dapat menemukan diagram untuk diekspor");
        return;
      }
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add title
      doc.setFontSize(18);
      doc.text("Laporan Lengkap Pengiriman", pageWidth / 2, 15, { align: 'center' });
      
      // Add date
      doc.setFontSize(11);
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 22, { align: 'center' });

      // Add filter range if available
      const urlParams = new URLSearchParams(window.location.search);
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');
      if (startDate && endDate) {
        doc.text(`Periode: ${startDate} s/d ${endDate}`, pageWidth / 2, 27, { align: 'center' });
      }
      
      // Calculate summary data
      const summary = {
        total: data.length,
        delivered: data.filter(s => s.status === "terkirim").length,
        pending: data.filter(s => s.status === "tertunda").length,
        failed: data.filter(s => s.status === "gagal").length,
        totalQty: data.reduce((sum, s) => sum + s.qty, 0)
      };
      
      // Add summary section
      let yPos = 35;
      doc.setFontSize(14);
      doc.text("Ringkasan Data", 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.text(`Total Pengiriman: ${summary.total}`, 14, yPos);
      yPos += 6;
      doc.text(`Terkirim: ${summary.delivered} (${summary.total > 0 ? Math.round((summary.delivered / summary.total) * 100) : 0}%)`, 14, yPos);
      yPos += 6;
      doc.text(`Tertunda: ${summary.pending} (${summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0}%)`, 14, yPos);
      yPos += 6;
      doc.text(`Gagal: ${summary.failed} (${summary.total > 0 ? Math.round((summary.failed / summary.total) * 100) : 0}%)`, 14, yPos);
      yPos += 6;
      doc.text(`Total Qty: ${summary.totalQty}`, 14, yPos);
      yPos += 10;
      
      // Add charts section
      doc.setFontSize(14);
      doc.text("Visualisasi Data", 14, yPos);
      yPos += 10;
      
      // Convert charts to images
      let currentY = yPos;
      let chartsAdded = 0;
      
      for (const chart of Array.from(chartElements)) {
        try {
          // If we've already added charts and need more space, add a new page
          if (chartsAdded > 0) {
            doc.addPage();
            currentY = 20;
          }
          
          const canvas = await html2canvas(chart as HTMLElement, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true
          });
          
          // Calculate aspect ratio and scale to fit page width with some margin
          const imgWidth = pageWidth - 20; // 10mm margin on each side
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 10, currentY, imgWidth, imgHeight);
          
          currentY += imgHeight + 10;
          chartsAdded++;
        } catch (err) {
          console.error("Error converting chart to image:", err);
        }
      }
      
      // Add driver statistics section
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Statistik Performa Supir", 14, 15);
      
      // Prepare driver statistics
      const driverStats = data.reduce((acc, shipment) => {
        const driverName = shipment.supir;
        if (!driverName) return acc;
        
        if (!acc[driverName]) {
          acc[driverName] = {
            name: driverName,
            total: 0,
            delivered: 0,
            pending: 0,
            failed: 0,
            reasons: []
          };
        }
        
        acc[driverName].total++;
        
        if (shipment.status === "terkirim") {
          acc[driverName].delivered++;
        } else if (shipment.status === "tertunda") {
          acc[driverName].pending++;
        } else if (shipment.status === "gagal") {
          acc[driverName].failed++;
          
          if (shipment.kendala && !acc[driverName].reasons.includes(shipment.kendala)) {
            acc[driverName].reasons.push(shipment.kendala);
          }
        }
        
        return acc;
      }, {} as Record<string, { name: string, total: number, delivered: number, pending: number, failed: number, reasons: string[] }>);
      
      // Create table for driver statistics
      const driverStatsArray = Object.values(driverStats).sort((a, b) => b.total - a.total);
      
      // Create driver stats table with reasons in a separate column
      const statsColumns = ["Supir", "Total", "Terkirim", "Tertunda", "Gagal"];
      
      const statsRows = driverStatsArray.map(driver => [
        driver.name,
        driver.total.toString(),
        driver.delivered.toString(),
        driver.pending.toString(),
        driver.failed.toString()
      ]);
      
      autoTable(doc, {
        head: [statsColumns],
        body: statsRows,
        startY: 20,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 20 }
      });
      
      // Add reasons in a separate table
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Alasan Kendala per Supir", 14, 15);
      
      const reasonsColumns = ["Supir", "Alasan Kendala"];
      const reasonsRows = driverStatsArray
        .filter(driver => driver.reasons.length > 0)
        .map(driver => [
          driver.name,
          driver.reasons.join(", ")
        ]);
      
      if (reasonsRows.length > 0) {
        autoTable(doc, {
          head: [reasonsColumns],
          body: reasonsRows,
          startY: 20,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          margin: { top: 20 }
        });
      } else {
        doc.setFontSize(11);
        doc.text("Tidak ada data kendala yang tercatat", pageWidth / 2, 30, { align: 'center' });
      }
      
      // Add shipment data table on a new page
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Data Pengiriman", 14, 15);
      
      // Prepare data for table
      const tableColumn = ["No. SJ", "Perusahaan", "Tujuan", "Supir", "Tgl Kirim", "Status", "Qty"];
      const tableRows = data.map((shipment) => [
        shipment.noSuratJalan,
        shipment.perusahaan,
        shipment.tujuan,
        shipment.supir,
        shipment.tanggalKirim,
        shipment.status,
        shipment.qty.toString()
      ]);
      
      // Create the table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 20 }
      });
      
      // Add company statistics on a new page
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Statistik per Perusahaan", 14, 15);
      
      // Group data by company
      const companyStats = data.reduce((acc, shipment) => {
        const company = shipment.perusahaan;
        if (!acc[company]) {
          acc[company] = {
            name: company,
            total: 0,
            delivered: 0,
            pending: 0,
            failed: 0,
            totalQty: 0
          };
        }
        
        acc[company].total++;
        acc[company].totalQty += shipment.qty;
        
        if (shipment.status === "terkirim") {
          acc[company].delivered++;
        } else if (shipment.status === "tertunda") {
          acc[company].pending++;
        } else if (shipment.status === "gagal") {
          acc[company].failed++;
        }
        
        return acc;
      }, {} as Record<string, { name: string; total: number; delivered: number; pending: number; failed: number; totalQty: number }>);
      
      // Create company stats table
      const companyColumns = ["Perusahaan", "Total", "Terkirim", "Tertunda", "Gagal", "Total Qty"];
      const companyRows = Object.values(companyStats).map(stat => [
        stat.name,
        stat.total.toString(),
        stat.delivered.toString(),
        stat.pending.toString(),
        stat.failed.toString(),
        stat.totalQty.toString()
      ]);
      
      autoTable(doc, {
        head: [companyColumns],
        body: companyRows,
        startY: 20,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { top: 20 }
      });
      
      // Save the PDF
      doc.save(`laporan_lengkap_${getTodayFormatted()}.pdf`);
      
      toast.success("Berhasil mengunduh laporan lengkap PDF");
    } catch (error) {
      console.error("Error exporting complete report:", error);
      toast.error("Gagal mengunduh laporan lengkap. Silakan coba lagi.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-gradient-blue hover:shadow-md transition-all duration-300">
          <Download className="mr-2 h-4 w-4" /> 
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsCSV}>
          Export Data Lengkap (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          Export Data Lengkap (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportGroupedByCompany}>
          Export Data per Perusahaan (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportGroupedByCompanyPDF}>
          Export Data per Perusahaan (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportSummaryStats}>
          Export Statistik (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportSummaryStatsPDF}>
          Export Statistik (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportCompleteReportPDF}>
          Export Laporan Lengkap dengan Diagram (PDF)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportOptions;
