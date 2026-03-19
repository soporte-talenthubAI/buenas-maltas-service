import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportOptions {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  filters?: Record<string, string>;
  filename?: string;
  orientation?: "portrait" | "landscape";
}

export function exportTableToPDF({
  title,
  columns,
  rows,
  filters,
  filename,
  orientation = "landscape",
}: ExportOptions) {
  const doc = new jsPDF({ orientation });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(217, 119, 6); // amber-600
  doc.text("Buenas Maltas", 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 30);

  // Filters info
  let yPos = 36;
  if (filters) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const filterParts = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`);
    if (filterParts.length) {
      doc.text(filterParts.join("  |  "), 14, yPos);
      yPos += 6;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`,
    14,
    yPos
  );

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: yPos + 6,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [217, 119, 6],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [255, 251, 235] },
    margin: { left: 14, right: 14 },
  });

  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `Pagina ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const name = filename || `${title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  doc.save(name);
}
