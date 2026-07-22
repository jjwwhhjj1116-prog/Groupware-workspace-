CREATE TABLE "ProjectOperation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "awardDate" TIMESTAMP(3),
    "expectedCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "startApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "startApprovedBy" TEXT,
    "startApprovedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectOperation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectOperationActivity" (
    "id" TEXT NOT NULL,
    "projectOperationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ProjectOperationActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectOperation_projectId_key" ON "ProjectOperation"("projectId");
CREATE INDEX "ProjectOperation_updatedAt_idx" ON "ProjectOperation"("updatedAt");
CREATE INDEX "ProjectOperationActivity_projectOperationId_occurredAt_idx" ON "ProjectOperationActivity"("projectOperationId", "occurredAt");
CREATE INDEX "ProjectOperationActivity_kind_occurredAt_idx" ON "ProjectOperationActivity"("kind", "occurredAt");

ALTER TABLE "ProjectOperation" ADD CONSTRAINT "ProjectOperation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectOperationActivity" ADD CONSTRAINT "ProjectOperationActivity_projectOperationId_fkey" FOREIGN KEY ("projectOperationId") REFERENCES "ProjectOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProjectOperation" ("id", "projectId", "expectedCompletionDate", "startApprovalStatus", "version", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT p."id", p."id", NULL, 'PENDING', 1, COALESCE(pi."acceptedBy", pi."createdBy"), COALESCE(pi."acceptedBy", pi."updatedBy"), COALESCE(pi."acceptedAt", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM "Project" p
JOIN "ProjectIntake" pi ON pi."projectId" = p."id"
WHERE pi."status" = 'ACCEPTED'
ON CONFLICT ("projectId") DO NOTHING;
