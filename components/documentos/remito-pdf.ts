import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { COMPANY } from "@/lib/constants/company";

interface RemitoItem {
  code: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface RemitoData {
  number: string | null;
  date: string;
  customer: {
    name: string;
    cuit: string | null;
    address: string;
    iva_condition: string | null;
    contact_name?: string | null;
    locality?: string;
    province?: string;
  };
  items: RemitoItem[];
  subtotal: number;
  discount: number;
  total: number;
  order_number: string;
  payment_condition?: string;
  observations?: string;
}

export function generateRemitoPDF(data: RemitoData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const rightCol = pageWidth - margin;

  // ═══════════════════════════════════════════════════════════════════
  // HEADER - Company info (left) + Document type (right)
  // ═══════════════════════════════════════════════════════════════════

  // Border around header
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margin, 10, pageWidth - margin * 2, 35);

  // Company logo area (left section)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, 10, 45, 35, "S");

  // "BUENAS MALTAS" logo text
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("BUENAS", margin + 5, 22);
  doc.text("MALTAS", margin + 5, 29);

  // Company details (center-left)
  const companyX = margin + 48;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.name, companyX, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Cuit: ${COMPANY.cuit}`, companyX, 20);
  doc.text(COMPANY.address, companyX, 24);
  doc.text(`${COMPANY.locality} - ${COMPANY.postalCode}`, companyX, 28);
  doc.text(COMPANY.email, companyX, 32);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY.ivaCondition, companyX, 38);

  // Document type box (right section)
  const typeBoxX = pageWidth - margin - 50;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(typeBoxX, 10, 50, 35);

  // "R" indicator
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("R", typeBoxX - 10, 20);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("Cód 91", typeBoxX - 12, 24);

  // "Remito" title
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Remito", typeBoxX + 10, 18);

  // Document number
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const docNumber = data.number || "S/N";
  doc.text(`N° ${COMPANY.puntoVenta} - ${docNumber.replace("REM-", "").padStart(8, "0")}`, typeBoxX + 5, 25);

  // Date
  const dateObj = new Date(data.date);
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear()).slice(-2);
  doc.setFontSize(8);
  doc.text("Fecha:", typeBoxX + 5, 32);
  doc.text(`${day}    ${month}    ${year}`, typeBoxX + 20, 32);

  // ═══════════════════════════════════════════════════════════════════
  // CLIENT SECTION
  // ═══════════════════════════════════════════════════════════════════

  const clientY = 50;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.rect(margin, clientY, pageWidth - margin * 2, 32);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Señor/es:", margin + 3, clientY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Razón Social
  let cy = clientY + 10;
  doc.setFont("helvetica", "bold");
  doc.text("RAZON SOCIAL", margin + 3, cy);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.customer.name}`, margin + 35, cy);

  // Domicilio
  cy += 5;
  doc.setFont("helvetica", "bold");
  doc.text("DOMICILIO", margin + 3, cy);
  doc.setFont("helvetica", "normal");
  const domicilio = data.customer.address;
  const province = data.customer.province || "Córdoba";
  doc.text(`: ${domicilio}`, margin + 35, cy);
  doc.text(province, rightCol - 30, cy);

  // CUIT
  cy += 5;
  doc.setFont("helvetica", "bold");
  doc.text("CUIT", margin + 3, cy);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.customer.cuit || "-"}`, margin + 35, cy);

  // Condición IVA + Condición de pago
  cy += 5;
  doc.setFont("helvetica", "bold");
  doc.text("COND. IVA", margin + 3, cy);
  doc.setFont("helvetica", "normal");
  doc.text(`: ${data.customer.iva_condition || "-"}`, margin + 35, cy);

  // Payment condition (right side)
  const payCondition = data.payment_condition || "CONTADO";
  doc.setFont("helvetica", "bold");
  doc.text(payCondition, rightCol - 30, cy);

  // ═══════════════════════════════════════════════════════════════════
  // ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════

  const tableStartY = clientY + 37;

  autoTable(doc, {
    startY: tableStartY,
    head: [["Artículo", "Descripción", "Cantidad"]],
    body: data.items.map((item) => [
      item.code,
      item.name,
      item.quantity.toFixed(2),
    ]),
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 30, halign: "left" },
      1: { halign: "left" },
      2: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.3,
    theme: "grid",
    // Min height to fill page
    willDrawPage: () => {},
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY ?? tableStartY + 60;

  // ═══════════════════════════════════════════════════════════════════
  // BRANDS SECTION
  // ═══════════════════════════════════════════════════════════════════

  finalY += 8;
  const brandWidth = (pageWidth - margin * 2) / COMPANY.brands.length;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);

  COMPANY.brands.forEach((brand, i) => {
    const x = margin + brandWidth * i + brandWidth / 2;
    doc.text(brand, x, finalY, { align: "center" });
  });

  // ═══════════════════════════════════════════════════════════════════
  // TRANSPORT & SIGNATURE SECTION
  // ═══════════════════════════════════════════════════════════════════

  finalY += 8;
  doc.setTextColor(0, 0, 0);

  // "Datos del transportista" header
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.rect(margin, finalY, pageWidth - margin * 2, 7);
  doc.text("Datos del transportista:", margin + 3, finalY + 5);

  finalY += 7;

  // Signature boxes: Preparó | Entregó | Recibí conforme
  const sigBoxWidth = (pageWidth - margin * 2) / 3;

  doc.rect(margin, finalY, sigBoxWidth, 25);
  doc.rect(margin + sigBoxWidth, finalY, sigBoxWidth, 25);
  doc.rect(margin + sigBoxWidth * 2, finalY, sigBoxWidth, 25);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Preparó:", margin + 3, finalY + 5);
  doc.text("Entregó:", margin + sigBoxWidth + 3, finalY + 5);
  doc.text("Recibí conforme:", margin + sigBoxWidth * 2 + 3, finalY + 5);

  // "Firma y sello" in the last box
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Firma y sello", margin + sigBoxWidth * 2 + sigBoxWidth / 2, finalY + 20, { align: "center" });

  finalY += 25;

  // Observations box
  doc.rect(margin, finalY, pageWidth - margin * 2, 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Observaciones:", margin + 3, finalY + 5);
  if (data.observations) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(data.observations, margin + 3, finalY + 10);
  }

  finalY += 15;

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER - Transport info + CAI
  // ═══════════════════════════════════════════════════════════════════

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  finalY += 4;
  doc.text(
    `PRIMIO: ${COMPANY.transportista.name}  CUIT: ${COMPANY.transportista.cuit}`,
    margin,
    finalY
  );

  doc.text("ORIGINAL: BLANCO", pageWidth / 2, finalY, { align: "center" });
  doc.text("DUPLICADO: COLOR", pageWidth / 2, finalY + 3, { align: "center" });

  // Page number
  doc.setFontSize(7);
  doc.setTextColor(150);
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.text(
    `Documento generado por Buenas Maltas - Sistema de Gestión`,
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  // Save
  const filename = `Remito_${data.number || "borrador"}.pdf`;
  doc.save(filename);
}
