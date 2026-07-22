CREATE TABLE "ProjectDeliveryWorkspace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "progressRate" INTEGER NOT NULL DEFAULT 0,
    "currentStage" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectDeliveryWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDeliveryRound" (
    "id" TEXT NOT NULL,
    "projectDeliveryWorkspaceId" TEXT NOT NULL,
    "roundNo" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DELIVERY',
    "parentRoundId" TEXT,
    "label" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "memo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDeliveryRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDeliveryFile" (
    "id" TEXT NOT NULL,
    "projectDeliveryRoundId" TEXT NOT NULL,
    "logicalFileKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "checksum" TEXT,
    "memo" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDeliveryFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDeliveryRecord" (
    "id" TEXT NOT NULL,
    "projectDeliveryWorkspaceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "writerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDeliveryRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDownloadRequest" (
    "id" TEXT NOT NULL,
    "projectDeliveryWorkspaceId" TEXT NOT NULL,
    "targetFile" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    CONSTRAINT "ProjectDownloadRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDailyReport" (
    "id" TEXT NOT NULL,
    "projectDeliveryWorkspaceId" TEXT NOT NULL,
    "scheduleRowId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "stage" TEXT NOT NULL,
    "planMemo" TEXT NOT NULL,
    "resultMemo" TEXT NOT NULL,
    "progressRate" INTEGER NOT NULL,
    "delayReason" TEXT NOT NULL,
    "overtimeReason" TEXT NOT NULL,
    "pmStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "managerStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "executiveStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectDailyReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectDeliveryHistory" (
    "id" TEXT NOT NULL,
    "projectDeliveryWorkspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "detailsJson" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectDeliveryHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectDeliveryWorkspace_projectId_key" ON "ProjectDeliveryWorkspace"("projectId");
CREATE INDEX "ProjectDeliveryWorkspace_status_updatedAt_idx" ON "ProjectDeliveryWorkspace"("status", "updatedAt");
CREATE UNIQUE INDEX "ProjectDeliveryRound_projectDeliveryWorkspaceId_roundNo_key" ON "ProjectDeliveryRound"("projectDeliveryWorkspaceId", "roundNo");
CREATE INDEX "ProjectDeliveryRound_projectDeliveryWorkspaceId_deliveryDate_idx" ON "ProjectDeliveryRound"("projectDeliveryWorkspaceId", "deliveryDate");
CREATE INDEX "ProjectDeliveryRound_parentRoundId_idx" ON "ProjectDeliveryRound"("parentRoundId");
CREATE UNIQUE INDEX "ProjectDeliveryFile_projectDeliveryRoundId_logicalFileKey_version_key" ON "ProjectDeliveryFile"("projectDeliveryRoundId", "logicalFileKey", "version");
CREATE INDEX "ProjectDeliveryFile_projectDeliveryRoundId_createdAt_idx" ON "ProjectDeliveryFile"("projectDeliveryRoundId", "createdAt");
CREATE INDEX "ProjectDeliveryRecord_projectDeliveryWorkspaceId_occurredAt_idx" ON "ProjectDeliveryRecord"("projectDeliveryWorkspaceId", "occurredAt");
CREATE INDEX "ProjectDownloadRequest_projectDeliveryWorkspaceId_requestedAt_idx" ON "ProjectDownloadRequest"("projectDeliveryWorkspaceId", "requestedAt");
CREATE INDEX "ProjectDownloadRequest_status_requestedAt_idx" ON "ProjectDownloadRequest"("status", "requestedAt");
CREATE INDEX "ProjectDailyReport_projectDeliveryWorkspaceId_reportDate_idx" ON "ProjectDailyReport"("projectDeliveryWorkspaceId", "reportDate");
CREATE INDEX "ProjectDailyReport_createdBy_reportDate_idx" ON "ProjectDailyReport"("createdBy", "reportDate");
CREATE INDEX "ProjectDeliveryHistory_projectDeliveryWorkspaceId_createdAt_idx" ON "ProjectDeliveryHistory"("projectDeliveryWorkspaceId", "createdAt");

ALTER TABLE "ProjectDeliveryWorkspace" ADD CONSTRAINT "ProjectDeliveryWorkspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDeliveryRound" ADD CONSTRAINT "ProjectDeliveryRound_projectDeliveryWorkspaceId_fkey" FOREIGN KEY ("projectDeliveryWorkspaceId") REFERENCES "ProjectDeliveryWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDeliveryRound" ADD CONSTRAINT "ProjectDeliveryRound_parentRoundId_fkey" FOREIGN KEY ("parentRoundId") REFERENCES "ProjectDeliveryRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectDeliveryFile" ADD CONSTRAINT "ProjectDeliveryFile_projectDeliveryRoundId_fkey" FOREIGN KEY ("projectDeliveryRoundId") REFERENCES "ProjectDeliveryRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDeliveryRecord" ADD CONSTRAINT "ProjectDeliveryRecord_projectDeliveryWorkspaceId_fkey" FOREIGN KEY ("projectDeliveryWorkspaceId") REFERENCES "ProjectDeliveryWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDownloadRequest" ADD CONSTRAINT "ProjectDownloadRequest_projectDeliveryWorkspaceId_fkey" FOREIGN KEY ("projectDeliveryWorkspaceId") REFERENCES "ProjectDeliveryWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDailyReport" ADD CONSTRAINT "ProjectDailyReport_projectDeliveryWorkspaceId_fkey" FOREIGN KEY ("projectDeliveryWorkspaceId") REFERENCES "ProjectDeliveryWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDeliveryHistory" ADD CONSTRAINT "ProjectDeliveryHistory_projectDeliveryWorkspaceId_fkey" FOREIGN KEY ("projectDeliveryWorkspaceId") REFERENCES "ProjectDeliveryWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProjectDeliveryWorkspace" ("id", "projectId", "status", "progressRate", "version", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT po."projectId", po."projectId", 'OPEN', 0, 1, po."createdBy", po."updatedBy", po."createdAt", CURRENT_TIMESTAMP
FROM "ProjectOperation" po
ON CONFLICT ("projectId") DO NOTHING;
