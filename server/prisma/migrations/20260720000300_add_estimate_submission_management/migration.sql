CREATE TABLE "EstimateSubmission" (
    "id" TEXT NOT NULL,
    "estimateSheetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "recipient" TEXT,
    "deliveryChannel" TEXT,
    "documentHash" TEXT NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstimateSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstimateSubmission_estimateSheetId_version_key"
ON "EstimateSubmission"("estimateSheetId", "version");

CREATE INDEX "EstimateSubmission_status_submittedAt_idx"
ON "EstimateSubmission"("status", "submittedAt");

CREATE INDEX "EstimateSubmission_sentAt_idx"
ON "EstimateSubmission"("sentAt");

ALTER TABLE "EstimateSubmission"
ADD CONSTRAINT "EstimateSubmission_estimateSheetId_fkey"
FOREIGN KEY ("estimateSheetId") REFERENCES "EstimateSheet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
