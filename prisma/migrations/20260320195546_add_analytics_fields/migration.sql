-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "sales_channel" TEXT NOT NULL DEFAULT 'Sin especificar';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cost_price" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "target_value" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_key_key" ON "KpiTarget"("key");
