-- OFF-PM-07 estimate database management. Deployment remains an explicit release operation.
CREATE TABLE "EstimateDbRecord" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "section" TEXT NOT NULL,
    "projectId" TEXT,
    "sourceRecordId" TEXT,
    "pjNo" TEXT,
    "year" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "dataJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateDbRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateDbVendor" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "normalizedTrade" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateDbVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateDbMonthlyTarget" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateDbMonthlyTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstimateDbRecord_section_sourceRecordId_key" ON "EstimateDbRecord"("section", "sourceRecordId");
CREATE UNIQUE INDEX "EstimateDbRecord_idempotencyKey_key" ON "EstimateDbRecord"("idempotencyKey");
CREATE INDEX "EstimateDbRecord_section_year_sortOrder_idx" ON "EstimateDbRecord"("section", "year", "sortOrder");
CREATE INDEX "EstimateDbRecord_projectId_idx" ON "EstimateDbRecord"("projectId");
CREATE INDEX "EstimateDbRecord_pjNo_idx" ON "EstimateDbRecord"("pjNo");
CREATE UNIQUE INDEX "EstimateDbVendor_normalizedName_normalizedTrade_key" ON "EstimateDbVendor"("normalizedName", "normalizedTrade");
CREATE INDEX "EstimateDbVendor_normalizedTrade_idx" ON "EstimateDbVendor"("normalizedTrade");
CREATE UNIQUE INDEX "EstimateDbMonthlyTarget_type_year_month_key" ON "EstimateDbMonthlyTarget"("type", "year", "month");
CREATE INDEX "EstimateDbMonthlyTarget_year_type_idx" ON "EstimateDbMonthlyTarget"("year", "type");

ALTER TABLE "EstimateDbRecord" ADD CONSTRAINT "EstimateDbRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
