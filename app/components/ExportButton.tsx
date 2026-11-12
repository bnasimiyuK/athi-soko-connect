"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type InvoiceData = {
  id: number;
  house_number: string;
  billing_month: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  type: string;
};

export default function ExportButton({ 
  invoices, 
  fileName = "Invoices",
  residentName = "Resident"
}: { 
  invoices: InvoiceData[]; 
  fileName?: string;
  residentName?: string;
}) {
  
  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (e) => reject(e);
    });
  };

  // 1. Generate Excel (.xlsx) with Centered Logo
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Invoices");

    // Set reasonable column widths (A to F)
    worksheet.columns = [
      { width: 15 }, // Month
      { width: 15 }, // House
      { width: 20 }, // Type
      { width: 15 }, // Amount Due
      { width: 15 }, // Amount Paid
      { width: 15 }, // Status
    ];

    // Set row heights for the top rows so the logo has space to sit without overlapping text
    worksheet.getRow(1).height = 15;
    worksheet.getRow(2).height = 15;
    worksheet.getRow(3).height = 15;
    worksheet.getRow(4).height = 15;
    worksheet.getRow(5).height = 15;

    // Add Logo (Centered across columns C and D, Row 2)
    try {
      const logoBase64 = await loadImage("/logo.png");
      const imageId = workbook.addImage({
        base64: logoBase64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 2, row: 1 } as any, // Column C (index 2), Row 2 (index 1)
        ext: { width: 80, height: 80 } as any // Scaled down to fit the rows
      });
    } catch (err) {
      console.warn("Could not load logo for Excel");
    }

    // Add empty row for spacing
    worksheet.addRow([]); 

    // Centered Titles (Merging columns A to F)
    worksheet.mergeCells('A7:F7');
    const titleCell = worksheet.getCell('A7');
    titleCell.value = "Athi Soko Connect";
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A8:F8');
    const subtitleCell = worksheet.getCell('A8');
    subtitleCell.value = "Athi Highway Estate";
    subtitleCell.font = { size: 10, color: { argb: "FF666666" } };
    subtitleCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Row 9 (Spacing)

    worksheet.mergeCells('A10:F10');
    const docTitleCell = worksheet.getCell('A10');
    docTitleCell.value = fileName;
    docTitleCell.font = { size: 14, bold: true };
    docTitleCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]); // Row 11 (Spacing)

    // Left-aligned details
    worksheet.getCell("A12").value = `Resident: ${residentName}`;
    worksheet.getCell("A13").value = `Generated: ${new Date().toLocaleDateString()}`;

    worksheet.addRow([]); // Row 14 (Spacing)

    // Add Table Headers
    const headerRow = worksheet.addRow(["Month", "House", "Type", "Amount Due", "Amount Paid", "Status"]); // Row 15
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' } // Dark Navy
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Add Data
    invoices.forEach(inv => {
      const row = worksheet.addRow([
        inv.billing_month,
        inv.house_number,
        inv.type,
        `KES ${Number(inv.amount_due).toLocaleString()}`,
        `KES ${Number(inv.amount_paid).toLocaleString()}`,
        inv.status.toUpperCase()
      ]);
      // Center align numeric columns
      row.getCell(4).alignment = { horizontal: 'right' };
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'center' };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${fileName}.xlsx`);
  };

  // 2. Generate PDF with Centered Logo (unchanged, as you said it looks good)
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await loadImage("/logo.png");
      doc.addImage(logoBase64, "PNG", 90, 15, 30, 30); 
    } catch (error) {
      console.warn("Logo could not be loaded, skipping...");
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Athi Soko Connect", 105, 52, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Athi Highway Estate", 105, 58, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(fileName, 105, 70, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Resident: ${residentName}`, 14, 80);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 85);

    const tableData = invoices.map(inv => [
      inv.billing_month,
      inv.house_number,
      inv.type,
      `KES ${Number(inv.amount_due).toLocaleString()}`,
      `KES ${Number(inv.amount_paid).toLocaleString()}`,
      inv.status.toUpperCase()
    ]);

    autoTable(doc, {
      head: [['Month', 'House', 'Type', 'Amount Due', 'Amount Paid', 'Status']],
      body: tableData,
      startY: 90,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9 },
    });

    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={handleExportPDF}
        className="flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
      >
        <Download size={14} /> PDF
      </button>
      <button 
        onClick={handleExportExcel}
        className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition"
      >
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}