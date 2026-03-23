-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('pendiente', 'visitado', 'no_visitado');

-- CreateTable
CREATE TABLE "VisitRoute" (
    "id" TEXT NOT NULL,
    "route_code" TEXT NOT NULL,
    "vendedor_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'planificada',
    "total_distance_km" DECIMAL(8,2),
    "estimated_duration" INTEGER,
    "google_maps_url" TEXT,
    "optimized_route" JSONB,
    "actual_start_time" TIMESTAMP(3),
    "actual_end_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitStop" (
    "id" TEXT NOT NULL,
    "visit_route_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "visit_order" INTEGER NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'pendiente',
    "visited_at" TIMESTAMP(3),
    "visit_latitude" DECIMAL(10,8),
    "visit_longitude" DECIMAL(11,8),
    "distance_to_customer" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VisitRoute_route_code_key" ON "VisitRoute"("route_code");

-- CreateIndex
CREATE UNIQUE INDEX "VisitStop_visit_route_id_customer_id_key" ON "VisitStop"("visit_route_id", "customer_id");

-- AddForeignKey
ALTER TABLE "VisitRoute" ADD CONSTRAINT "VisitRoute_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStop" ADD CONSTRAINT "VisitStop_visit_route_id_fkey" FOREIGN KEY ("visit_route_id") REFERENCES "VisitRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitStop" ADD CONSTRAINT "VisitStop_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
