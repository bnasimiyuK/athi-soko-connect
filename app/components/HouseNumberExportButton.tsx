"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type ResidentData = {
  name: string | null;
  phone: string;
  phase: string | null;
  courtName: string | null;
  houseNumber: string | null;
};

export default function HouseNumberExportButton({ 
  residents, 
  fileName = "House_Numbers_Registry"
}: { 
  residents: ResidentData[]; 
  fileName?: string;
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

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("House Numbers");

    worksheet.columns = [
      { width: 25 }, { width: 20 }, { width: 15 }, { width: 20 }, { width: 20 },
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

    worksheet.mergeCells('A7:E7');
    worksheet.getCell('A7').value = "Athi Soko Connect";
    worksheet.getCell('A7').font = { size: 16, bold: true };
    worksheet.getCell('A7').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A8:E8');
    worksheet.getCell('A8').value = "Athi Highway Estate";
    worksheet.getCell('A8').font = { size: 10, color: { argb: "FF666666" } };
    worksheet.getCell('A8').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A10:E10');
    worksheet.getCell('A10').value = fileName.replace(/_/g, ' ');
    worksheet.getCell('A10').font = { size: 14, bold: true };
    worksheet.getCell('A10').alignment = { horizontal: 'center' };

    worksheet.getCell("A12").value = `Generated: ${new Date().toLocaleDateString()}`;

    const headerRow = worksheet.addRow(["Resident Name", "Phone Number", "Phase", "Court Name", "House Number"]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    residents.forEach(res => {
      worksheet.addRow([
        res.name || "Unnamed", res.phone, res.phase || "-", res.courtName || "-", res.houseNumber || "Unassigned"
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `${fileName}.xlsx`);
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
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Athi Highway Estate", 105, 58, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(fileName.replace(/_/g, ' '), 105, 70, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 80);

    const tableData = residents.map(res => [
      res.name || "Unnamed", res.phone, res.phase || "-", res.courtName || "-", res.houseNumber || "Unassigned"
    ]);

    autoTable(doc, {
      head: [['Resident Name', 'Phone Number', 'Phase', 'Court Name', 'House Number']],
      body: tableData,
      startY: 85,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 9 },
    });

    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleExportPDF} className="flex items-center gap-1.5 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg transition shadow-sm border border-red-100">
        <Download size={14} /> PDF
      </button>
      <button onClick={handleExportExcel} className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg transition shadow-sm border border-green-100">
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}