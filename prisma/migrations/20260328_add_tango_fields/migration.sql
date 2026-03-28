-- Product: add Tango fields
ALTER TABLE "Product" ADD COLUMN "tango_id" INTEGER;
ALTER TABLE "Product" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Product" ADD COLUMN "synonym" TEXT;
ALTER TABLE "Product" ADD COLUMN "familia" TEXT;
ALTER TABLE "Product" ADD COLUMN "grupo" TEXT;
ALTER TABLE "Product" ADD COLUMN "has_stock" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN "um_stock" TEXT;
ALTER TABLE "Product" ADD COLUMN "um_ventas" TEXT;
CREATE UNIQUE INDEX "Product_tango_id_key" ON "Product"("tango_id");

-- Customer: add Tango fields
ALTER TABLE "Customer" ADD COLUMN "razon_social" TEXT;
ALTER TABLE "Customer" ADD COLUMN "delivery_address" TEXT;
ALTER TABLE "Customer" ADD COLUMN "horario_cobranza" TEXT;
ALTER TABLE "Customer" ADD COLUMN "tango_id" INTEGER;
ALTER TABLE "Customer" ADD COLUMN "condicion_venta" TEXT;
ALTER TABLE "Customer" ADD COLUMN "zona" TEXT;
ALTER TABLE "Customer" ADD COLUMN "vendedor_cod" TEXT;
ALTER TABLE "Customer" ALTER COLUMN "street_number" SET DEFAULT '';
CREATE UNIQUE INDEX "Customer_tango_id_key" ON "Customer"("tango_id");

-- Order: add Tango fields
ALTER TABLE "Order" ADD COLUMN "vendedor_nombre" TEXT;
ALTER TABLE "Order" ADD COLUMN "condicion_venta" TEXT;
ALTER TABLE "Order" ADD COLUMN "deposito" TEXT;
ALTER TABLE "Order" ADD COLUMN "lista_precio" TEXT;
ALTER TABLE "Order" ADD COLUMN "remito_nro" TEXT;
ALTER TABLE "Order" ADD COLUMN "moneda" TEXT DEFAULT '$';
ALTER TABLE "Order" ADD COLUMN "tango_estado" INTEGER;

-- OrderItem: add discount_percent
ALTER TABLE "OrderItem" ADD COLUMN "discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0;
