CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "channelId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Activity_userId_workspaceId_read_idx" ON "Activity"("userId", "workspaceId", "read");
CREATE INDEX "Activity_workspaceId_createdAt_idx" ON "Activity"("workspaceId", "createdAt");

ALTER TABLE "Activity"
  ADD CONSTRAINT "Activity_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
