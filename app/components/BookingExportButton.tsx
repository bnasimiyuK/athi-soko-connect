"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function BookingExportButton({ bookings }: { bookings: any[] }) {
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bookings");

    worksheet.columns = [
      { width: 20 }, { width: 25 }, { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    for (let i = 1; i <= 5; i++) worksheet.getRow(i).height = 15;

    try {
      const logoBase64 = await loadImage("/logo.png");
      const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      worksheet.addImage(imageId, {
        tl: { col: 1, row: 1 } as any, 
        ext: { width: 80, height: 80 } as any 
      });
    } catch (err) {}

    worksheet.mergeCells('A7:F7');
    worksheet.getCell('A7').value = "Athi Soko Connect";
    worksheet.getCell('A7').font = { size: 16, bold: true };
    worksheet.getCell('A7').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A9:F9');
    worksheet.getCell('A9').value = "My Bookings Report";
    worksheet.getCell('A9').font = { size: 14, bold: true };
    worksheet.getCell('A9').alignment = { horizontal: 'center' };

    worksheet.getCell("A11").value = `Generated: ${new Date().toLocaleDateString()}`;

    const headerRow = worksheet.addRow(["Service", "Resident", "Phone", "Date", "Time", "Status"]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    bookings.forEach(b => {
      worksheet.addRow([b.service, b.resident_name, b.resident_phone, b.job_date, b.job_time, b.status.toUpperCase()]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `My_Bookings.xlsx`);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF();
    
    try {
      const logoBase64 = await loadImage("/logo.png");
      doc.addImage(logoBase64, "PNG", 90, 15, 30, 30); 
    } catch (error) {}

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Athi Soko Connect", 105, 52, { align: "center" });
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("My Bookings Report", 105, 62, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 72);

    const tableData = bookings.map(b => [
      b.service, b.resident_name, b.resident_phone, b.job_date, b.job_time, b.status.toUpperCase()
    ]);

    autoTable(doc, {
      head: [['Service', 'Resident', 'Phone', 'Date', 'Time', 'Status']],
      body: tableData,
      startY: 78,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9 },
    });

    doc.save(`My_Bookings.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition">
        <Download size={14} /> PDF
      </button>
      <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}