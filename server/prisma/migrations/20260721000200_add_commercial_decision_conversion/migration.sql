-- CreateTable
CREATE TABLE "CommercialDecision" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "estimateSheetId" TEXT,
    "estimateSubmissionId" TEXT,
    "projectId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "agreedAmount" DECIMAL(18,2),
    "agreedScope" TEXT,
    "agreedSchedule" TEXT,
    "startCondition" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommercialDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectIntake" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "commercialDecisionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "projectNo" TEXT NOT NULL,
    "sourceSnapshotJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectIntake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercialDecision_projectId_key" ON "CommercialDecision"("projectId");
CREATE UNIQUE INDEX "CommercialDecision_idempotencyKey_key" ON "CommercialDecision"("idempotencyKey");
CREATE INDEX "CommercialDecision_estimateRequestId_decidedAt_idx" ON "CommercialDecision"("estimateRequestId", "decidedAt");
CREATE INDEX "CommercialDecision_decision_decidedAt_idx" ON "CommercialDecision"("decision", "decidedAt");
CREATE UNIQUE INDEX "ProjectIntake_estimateRequestId_key" ON "ProjectIntake"("estimateRequestId");
CREATE UNIQUE INDEX "ProjectIntake_commercialDecisionId_key" ON "ProjectIntake"("commercialDecisionId");
CREATE UNIQUE INDEX "ProjectIntake_projectId_key" ON "ProjectIntake"("projectId");
CREATE INDEX "ProjectIntake_status_updatedAt_idx" ON "ProjectIntake"("status", "updatedAt");

ALTER TABLE "CommercialDecision" ADD CONSTRAINT "CommercialDecision_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialDecision" ADD CONSTRAINT "CommercialDecision_estimateSheetId_fkey" FOREIGN KEY ("estimateSheetId") REFERENCES "EstimateSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDecision" ADD CONSTRAINT "CommercialDecision_estimateSubmissionId_fkey" FOREIGN KEY ("estimateSubmissionId") REFERENCES "EstimateSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialDecision" ADD CONSTRAINT "CommercialDecision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_commercialDecisionId_fkey" FOREIGN KEY ("commercialDecisionId") REFERENCES "CommercialDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIntake" ADD CONSTRAINT "ProjectIntake_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
