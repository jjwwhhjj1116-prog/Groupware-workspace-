CREATE TABLE "ProjectQcChecklist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectQcChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectQcItem" (
    "id" TEXT NOT NULL,
    "projectQcChecklistId" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "middleCategory" TEXT,
    "subCategory" TEXT,
    "trade" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "targetsJson" TEXT NOT NULL,
    "checksJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT NOT NULL,
    "objectionJson" TEXT,
    "eliminated" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ProjectQcItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectQcAttachment" (
    "id" TEXT NOT NULL,
    "projectQcItemId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT,
    "checksum" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ProjectQcAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectQcHistory" (
    "id" TEXT NOT NULL,
    "projectQcChecklistId" TEXT NOT NULL,
    "projectQcItemId" TEXT,
    "action" TEXT NOT NULL,
    "detailsJson" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectQcHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectQcTerm" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectQcTerm_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectQcChecklist_projectId_key" ON "ProjectQcChecklist"("projectId");
CREATE INDEX "ProjectQcChecklist_updatedAt_idx" ON "ProjectQcChecklist"("updatedAt");
CREATE INDEX "ProjectQcItem_projectQcChecklistId_group_serialNo_idx" ON "ProjectQcItem"("projectQcChecklistId", "group", "serialNo");
CREATE INDEX "ProjectQcItem_status_updatedAt_idx" ON "ProjectQcItem"("status", "updatedAt");
CREATE INDEX "ProjectQcAttachment_projectQcItemId_createdAt_idx" ON "ProjectQcAttachment"("projectQcItemId", "createdAt");
CREATE INDEX "ProjectQcHistory_projectQcChecklistId_createdAt_idx" ON "ProjectQcHistory"("projectQcChecklistId", "createdAt");
CREATE INDEX "ProjectQcHistory_projectQcItemId_createdAt_idx" ON "ProjectQcHistory"("projectQcItemId", "createdAt");
CREATE UNIQUE INDEX "ProjectQcTerm_term_key" ON "ProjectQcTerm"("term");
CREATE INDEX "ProjectQcTerm_updatedAt_idx" ON "ProjectQcTerm"("updatedAt");

ALTER TABLE "ProjectQcChecklist" ADD CONSTRAINT "ProjectQcChecklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectQcItem" ADD CONSTRAINT "ProjectQcItem_projectQcChecklistId_fkey" FOREIGN KEY ("projectQcChecklistId") REFERENCES "ProjectQcChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectQcAttachment" ADD CONSTRAINT "ProjectQcAttachment_projectQcItemId_fkey" FOREIGN KEY ("projectQcItemId") REFERENCES "ProjectQcItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectQcHistory" ADD CONSTRAINT "ProjectQcHistory_projectQcChecklistId_fkey" FOREIGN KEY ("projectQcChecklistId") REFERENCES "ProjectQcChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectQcHistory" ADD CONSTRAINT "ProjectQcHistory_projectQcItemId_fkey" FOREIGN KEY ("projectQcItemId") REFERENCES "ProjectQcItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "ProjectQcChecklist" ("id", "projectId", "status", "version", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT po."projectId", po."projectId", 'OPEN', 1, po."createdBy", po."updatedBy", po."createdAt", CURRENT_TIMESTAMP
FROM "ProjectOperation" po
ON CONFLICT ("projectId") DO NOTHING;
