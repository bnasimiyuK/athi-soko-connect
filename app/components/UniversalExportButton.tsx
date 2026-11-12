"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type Column = {
  key: string;
  label: string;
};

export default function UniversalExportButton({ 
  data, 
  columns, 
  fileName = "Estate_Report",
  title = "Estate Report"
}: { 
  data: any[]; 
  columns: Column[]; 
  fileName?: string;
  title?: string;
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

  // 1. Generate Excel (.xlsx)
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report");

    // Set column widths based on headers
    worksheet.columns = columns.map(col => ({ width: 25 }));

    // Set row heights
    for (let i = 1; i <= 5; i++) worksheet.getRow(i).height = 15;

    // Add Logo
    try {
      const logoBase64 = await loadImage("/logo.png");
      const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      // Place roughly in the middle
      const centerCol = Math.max(0, Math.floor(columns.length / 2) - 1);
      worksheet.addImage(imageId, {
        tl: { col: centerCol, row: 1 } as any,
        ext: { width: 80, height: 80 } as any 
      });
    } catch (err) {}

    // Titles
    const lastColLetter = String.fromCharCode(64 + columns.length); // e.g., F for 6 cols
    worksheet.mergeCells(`A7:${lastColLetter}7`);
    worksheet.getCell('A7').value = "Athi Soko Connect";
    worksheet.getCell('A7').font = { size: 16, bold: true };
    worksheet.getCell('A7').alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A9:${lastColLetter}9`);
    worksheet.getCell('A9').value = title.replace(/_/g, ' ');
    worksheet.getCell('A9').font = { size: 14, bold: true };
    worksheet.getCell('A9').alignment = { horizontal: 'center' };

    worksheet.getCell("A11").value = `Generated: ${new Date().toLocaleDateString()}`;

    // Table Headers
    const headerRow = worksheet.addRow(columns.map(c => c.label));
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    // Data
    data.forEach(row => {
      const rowData = columns.map(c => row[c.key] ?? "-");
      worksheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${fileName}.xlsx`);
  };

  // 2. Generate PDF
  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await loadImage("/logo.png");
      // Center logo based on page width (approx 105)
      doc.addImage(logoBase64, "PNG", 90, 15, 30, 30); 
    } catch (error) {}

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Athi Soko Connect", 105, 52, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title.replace(/_/g, ' '), 105, 62, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 72);

    const tableData = data.map(row => 
      columns.map(c => row[c.key] ?? "-")
    );

    autoTable(doc, {
      head: [columns.map(c => c.label)],
      body: tableData,
      startY: 78,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8 },
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