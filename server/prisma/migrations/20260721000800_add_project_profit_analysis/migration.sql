CREATE TABLE "UnitPriceTable" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitPriceTable_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitPriceEntry" (
    "id" TEXT NOT NULL,
    "unitPriceTableId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnitPriceEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProfitAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "unitPriceTableId" TEXT,
    "sourceCommercialDecisionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectProfitAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfitContractAmount" (
    "id" TEXT NOT NULL,
    "projectProfitAnalysisId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfitContractAmount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProfitRound" (
    "id" TEXT NOT NULL,
    "projectProfitAnalysisId" TEXT NOT NULL,
    "roundNo" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectProfitRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProfitMember" (
    "id" TEXT NOT NULL,
    "projectProfitRoundId" TEXT NOT NULL,
    "personnelId" TEXT,
    "sourceScheduleRowId" TEXT,
    "category" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workDatesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectProfitMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProfitOtherCost" (
    "id" TEXT NOT NULL,
    "projectProfitRoundId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectProfitOtherCost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProfitHistory" (
    "id" TEXT NOT NULL,
    "projectProfitAnalysisId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detailsJson" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectProfitHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UnitPriceTable_version_key" ON "UnitPriceTable"("version");
CREATE INDEX "UnitPriceTable_active_effectiveDate_idx" ON "UnitPriceTable"("active", "effectiveDate");
CREATE UNIQUE INDEX "UnitPriceEntry_unitPriceTableId_grade_key" ON "UnitPriceEntry"("unitPriceTableId", "grade");
CREATE UNIQUE INDEX "ProjectProfitAnalysis_projectId_key" ON "ProjectProfitAnalysis"("projectId");
CREATE INDEX "ProjectProfitAnalysis_status_updatedAt_idx" ON "ProjectProfitAnalysis"("status", "updatedAt");
CREATE INDEX "ProjectProfitAnalysis_unitPriceTableId_idx" ON "ProjectProfitAnalysis"("unitPriceTableId");
CREATE UNIQUE INDEX "ProfitContractAmount_projectProfitAnalysisId_category_key" ON "ProfitContractAmount"("projectProfitAnalysisId", "category");
CREATE UNIQUE INDEX "ProjectProfitRound_projectProfitAnalysisId_roundNo_key" ON "ProjectProfitRound"("projectProfitAnalysisId", "roundNo");
CREATE INDEX "ProjectProfitMember_projectProfitRoundId_category_idx" ON "ProjectProfitMember"("projectProfitRoundId", "category");
CREATE INDEX "ProjectProfitMember_personnelId_idx" ON "ProjectProfitMember"("personnelId");
CREATE UNIQUE INDEX "ProjectProfitOtherCost_projectProfitRoundId_category_key" ON "ProjectProfitOtherCost"("projectProfitRoundId", "category");
CREATE INDEX "ProjectProfitHistory_projectProfitAnalysisId_createdAt_idx" ON "ProjectProfitHistory"("projectProfitAnalysisId", "createdAt");

ALTER TABLE "UnitPriceEntry" ADD CONSTRAINT "UnitPriceEntry_unitPriceTableId_fkey" FOREIGN KEY ("unitPriceTableId") REFERENCES "UnitPriceTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitAnalysis" ADD CONSTRAINT "ProjectProfitAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitAnalysis" ADD CONSTRAINT "ProjectProfitAnalysis_unitPriceTableId_fkey" FOREIGN KEY ("unitPriceTableId") REFERENCES "UnitPriceTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProfitContractAmount" ADD CONSTRAINT "ProfitContractAmount_projectProfitAnalysisId_fkey" FOREIGN KEY ("projectProfitAnalysisId") REFERENCES "ProjectProfitAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitRound" ADD CONSTRAINT "ProjectProfitRound_projectProfitAnalysisId_fkey" FOREIGN KEY ("projectProfitAnalysisId") REFERENCES "ProjectProfitAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitMember" ADD CONSTRAINT "ProjectProfitMember_projectProfitRoundId_fkey" FOREIGN KEY ("projectProfitRoundId") REFERENCES "ProjectProfitRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitOtherCost" ADD CONSTRAINT "ProjectProfitOtherCost_projectProfitRoundId_fkey" FOREIGN KEY ("projectProfitRoundId") REFERENCES "ProjectProfitRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectProfitHistory" ADD CONSTRAINT "ProjectProfitHistory_projectProfitAnalysisId_fkey" FOREIGN KEY ("projectProfitAnalysisId") REFERENCES "ProjectProfitAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProjectProfitAnalysis" ("id", "projectId", "sourceCommercialDecisionId", "status", "version", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT p."id", p."id", cd."id", 'OPEN', 1, p."managerId", p."managerId", p."createdAt", CURRENT_TIMESTAMP
FROM "Project" p
LEFT JOIN "CommercialDecision" cd ON cd."projectId" = p."id"
ON CONFLICT ("projectId") DO NOTHING;

INSERT INTO "ProfitContractAmount" ("id", "projectProfitAnalysisId", "category", "amount", "sourceType", "sourceRef", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, ppa."id", categories."category",
       CASE WHEN categories."category" = 'STRUCTURE' THEN COALESCE(cd."agreedAmount", 0) ELSE 0 END,
       CASE WHEN categories."category" = 'STRUCTURE' AND cd."agreedAmount" IS NOT NULL THEN 'COMMERCIAL_DECISION' ELSE 'MANUAL' END,
       CASE WHEN categories."category" = 'STRUCTURE' AND cd."agreedAmount" IS NOT NULL THEN cd."id" ELSE NULL END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ProjectProfitAnalysis" ppa
LEFT JOIN "CommercialDecision" cd ON cd."projectId" = ppa."projectId"
CROSS JOIN (VALUES ('STRUCTURE'), ('FINISH'), ('CIVIL'), ('MECHANICAL'), ('ELECTRICAL'), ('OUTSOURCING'), ('AS')) AS categories("category")
ON CONFLICT ("projectProfitAnalysisId", "category") DO NOTHING;

INSERT INTO "ProjectProfitRound" ("id", "projectProfitAnalysisId", "roundNo", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, ppa."id", rounds."roundNo", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ProjectProfitAnalysis" ppa
CROSS JOIN (VALUES (1), (2), (3)) AS rounds("roundNo")
ON CONFLICT ("projectProfitAnalysisId", "roundNo") DO NOTHING;

INSERT INTO "ProjectProfitOtherCost" ("id", "projectProfitRoundId", "category", "amount", "sourceType", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, rounds."id", categories."category", 0, 'MANUAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "ProjectProfitRound" rounds
CROSS JOIN (VALUES ('MECHANICAL'), ('ELECTRICAL'), ('OUTSOURCING'), ('AS')) AS categories("category")
ON CONFLICT ("projectProfitRoundId", "category") DO NOTHING;
