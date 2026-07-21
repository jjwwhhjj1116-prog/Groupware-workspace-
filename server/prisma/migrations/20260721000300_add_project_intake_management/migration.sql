ALTER TABLE "ProjectIntake"
ADD COLUMN "draftJson" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "acceptedBy" TEXT,
ADD COLUMN "acceptedAt" TIMESTAMP(3);

CREATE TABLE "ProjectIntakeHistory" (
    "id" TEXT NOT NULL,
    "projectIntakeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "changesJson" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectIntakeHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectIntakeHistory_projectIntakeId_createdAt_idx"
ON "ProjectIntakeHistory"("projectIntakeId", "createdAt");

ALTER TABLE "ProjectIntakeHistory"
ADD CONSTRAINT "ProjectIntakeHistory_projectIntakeId_fkey"
FOREIGN KEY ("projectIntakeId") REFERENCES "ProjectIntake"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
