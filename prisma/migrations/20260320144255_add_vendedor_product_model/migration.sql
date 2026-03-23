-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'vendedor';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "customer_type" TEXT NOT NULL DEFAULT 'minorista';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "order_type" TEXT,
ADD COLUMN     "payment_method" TEXT;

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'Buenas Maltas',
    "category" TEXT NOT NULL DEFAULT 'cerveza',
    "unit_price" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
