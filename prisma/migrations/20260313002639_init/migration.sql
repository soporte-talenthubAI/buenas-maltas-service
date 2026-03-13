-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'repartidor');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pendiente', 'confirmado', 'documentado', 'en_ruta', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('baja', 'normal', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('presupuesto', 'orden_venta', 'remito', 'factura');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('borrador', 'emitido', 'anulado');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('planificada', 'en_curso', 'completada', 'cancelada');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pendiente', 'entregado', 'no_entregado', 'reprogramado');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_access" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "commercial_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "cuit" TEXT,
    "iva_condition" TEXT,
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'Córdoba',
    "postal_code" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "has_time_restriction" BOOLEAN NOT NULL DEFAULT false,
    "delivery_window_start" TEXT,
    "delivery_window_end" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "delivery_date" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'pendiente',
    "priority" "OrderPriority" NOT NULL DEFAULT 'normal',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "observations" TEXT,
    "tango_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "number" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'borrador',
    "data" JSONB,
    "pdf_url" TEXT,
    "tango_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "route_code" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'planificada',
    "total_distance_km" DECIMAL(8,2),
    "estimated_duration" INTEGER,
    "fuel_cost" DECIMAL(10,2),
    "driver_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "google_maps_url" TEXT,
    "optimized_route" JSONB,
    "vrptw_result" JSONB,
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteOrder" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "delivery_order" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pendiente',
    "actual_arrival" TIMESTAMP(3),
    "delivery_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tango_id_key" ON "Order"("tango_id");

-- CreateIndex
CREATE UNIQUE INDEX "Route_route_code_key" ON "Route"("route_code");

-- CreateIndex
CREATE UNIQUE INDEX "RouteOrder_route_id_order_id_key" ON "RouteOrder"("route_id", "order_id");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOrder" ADD CONSTRAINT "RouteOrder_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteOrder" ADD CONSTRAINT "RouteOrder_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
