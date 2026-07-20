CREATE TABLE "EstimateTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateSheet" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateSheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateSheetVersion" (
    "id" TEXT NOT NULL,
    "estimateSheetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "templateHash" TEXT NOT NULL,
    "stateJson" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateSheetVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateSheetExport" (
    "id" TEXT NOT NULL,
    "estimateSheetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateSheetExport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstimateTemplate_type_key" ON "EstimateTemplate"("type");
CREATE UNIQUE INDEX "EstimateSheet_estimateRequestId_key" ON "EstimateSheet"("estimateRequestId");
CREATE UNIQUE INDEX "EstimateSheet_idempotencyKey_key" ON "EstimateSheet"("idempotencyKey");
CREATE INDEX "EstimateSheet_templateType_status_idx" ON "EstimateSheet"("templateType", "status");
CREATE UNIQUE INDEX "EstimateSheetVersion_estimateSheetId_version_key" ON "EstimateSheetVersion"("estimateSheetId", "version");
CREATE INDEX "EstimateSheetVersion_estimateSheetId_createdAt_idx" ON "EstimateSheetVersion"("estimateSheetId", "createdAt");
CREATE INDEX "EstimateSheetExport_estimateSheetId_createdAt_idx" ON "EstimateSheetExport"("estimateSheetId", "createdAt");

ALTER TABLE "EstimateSheet" ADD CONSTRAINT "EstimateSheet_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateSheet" ADD CONSTRAINT "EstimateSheet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EstimateTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstimateSheetVersion" ADD CONSTRAINT "EstimateSheetVersion_estimateSheetId_fkey" FOREIGN KEY ("estimateSheetId") REFERENCES "EstimateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateSheetExport" ADD CONSTRAINT "EstimateSheetExport_estimateSheetId_fkey" FOREIGN KEY ("estimateSheetId") REFERENCES "EstimateSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
