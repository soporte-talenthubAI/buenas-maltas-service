-- CreateTable
CREATE TABLE "DepotConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Depósito Principal',
    "street" TEXT NOT NULL,
    "street_number" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "province" TEXT NOT NULL DEFAULT 'Córdoba',
    "postal_code" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 200,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepotConfig_pkey" PRIMARY KEY ("id")
);
