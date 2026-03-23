export const COMPANY = {
  name: "BUENAS MALTAS S.A.S",
  cuit: "30-71630332-9",
  address: "Ruta Nacional 19 km 313 - Monte Cristo",
  locality: "Córdoba",
  postalCode: "5125",
  email: "info@traumerbier.com.ar",
  ivaCondition: "IVA RESPONSABLE INSCRIPTO",
  // Datos del transportista (del remito)
  transportista: {
    name: "DIEGO A. SOSA",
    cuit: "20-22564992-9",
  },
  // Marcas
  brands: ["TRÄUMER BIER", "VITEA KOMBUCHA", "BEERMUT", "MIXOLOGY"],
  // Punto de venta para numeración
  puntoVenta: "0002",
} as const;
