CREATE TABLE "EstimateRequest" (
    "id" TEXT NOT NULL,
    "requestNo" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUEST_MEMO',
    "projectName" TEXT NOT NULL,
    "company" TEXT,
    "client" TEXT,
    "contact" TEXT,
    "contactDepartment" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ownerId" TEXT,
    "departmentId" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memo" TEXT,
    "rawMemo" TEXT,
    "firstDelivery" TEXT,
    "secondDelivery" TEXT,
    "thirdDelivery" TEXT,
    "finalDelivery" TEXT,
    "expectedStartDate" TEXT,
    "areaPy" TEXT,
    "floors" TEXT,
    "scope" TEXT,
    "usage" TEXT,
    "buildingCount" TEXT,
    "unitWork" TEXT,
    "bidDate" TEXT,
    "estimateType" TEXT,
    "estimateId" TEXT,
    "projectId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstimateRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateRequestActivity" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateRequestActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateRequestAttachment" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,
    "memo" TEXT,
    "storageKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateRequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateRequestHistory" (
    "id" TEXT NOT NULL,
    "estimateRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "changes" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstimateRequestHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstimateRequest_requestNo_key" ON "EstimateRequest"("requestNo");
CREATE UNIQUE INDEX "EstimateRequest_idempotencyKey_key" ON "EstimateRequest"("idempotencyKey");
CREATE UNIQUE INDEX "EstimateRequest_projectId_key" ON "EstimateRequest"("projectId");
CREATE INDEX "EstimateRequest_departmentId_status_idx" ON "EstimateRequest"("departmentId", "status");
CREATE INDEX "EstimateRequest_ownerId_idx" ON "EstimateRequest"("ownerId");
CREATE INDEX "EstimateRequest_createdAt_idx" ON "EstimateRequest"("createdAt");
CREATE INDEX "EstimateRequestActivity_estimateRequestId_occurredAt_idx" ON "EstimateRequestActivity"("estimateRequestId", "occurredAt");
CREATE INDEX "EstimateRequestAttachment_estimateRequestId_category_idx" ON "EstimateRequestAttachment"("estimateRequestId", "category");
CREATE INDEX "EstimateRequestHistory_estimateRequestId_createdAt_idx" ON "EstimateRequestHistory"("estimateRequestId", "createdAt");

ALTER TABLE "EstimateRequest" ADD CONSTRAINT "EstimateRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "PersonnelCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateRequest" ADD CONSTRAINT "EstimateRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateRequestActivity" ADD CONSTRAINT "EstimateRequestActivity_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateRequestAttachment" ADD CONSTRAINT "EstimateRequestAttachment_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimateRequestHistory" ADD CONSTRAINT "EstimateRequestHistory_estimateRequestId_fkey" FOREIGN KEY ("estimateRequestId") REFERENCES "EstimateRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
