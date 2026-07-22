CREATE TABLE "ProjectPmSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    "assignmentsJson" TEXT NOT NULL,
    "requestTargetsJson" TEXT NOT NULL,
    "requestMemo" TEXT,
    "plan1Json" TEXT NOT NULL,
    "plan2Json" TEXT NOT NULL,
    "selectedProposal" TEXT,
    "approvedPlan" TEXT,
    "rejectReason" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectPmSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectPmScheduleHistory" (
    "id" TEXT NOT NULL,
    "projectPmScheduleId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "detailsJson" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectPmScheduleHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectPmSchedule_projectId_key" ON "ProjectPmSchedule"("projectId");
CREATE INDEX "ProjectPmSchedule_status_updatedAt_idx" ON "ProjectPmSchedule"("status", "updatedAt");
CREATE INDEX "ProjectPmScheduleHistory_projectPmScheduleId_createdAt_idx"
ON "ProjectPmScheduleHistory"("projectPmScheduleId", "createdAt");

ALTER TABLE "ProjectPmSchedule"
ADD CONSTRAINT "ProjectPmSchedule_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectPmScheduleHistory"
ADD CONSTRAINT "ProjectPmScheduleHistory_projectPmScheduleId_fkey"
FOREIGN KEY ("projectPmScheduleId") REFERENCES "ProjectPmSchedule"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
