ALTER TABLE "Workspace"
  ADD COLUMN "clerkOrganizationId" TEXT;

CREATE UNIQUE INDEX "Workspace_clerkOrganizationId_key"
  ON "Workspace"("clerkOrganizationId");
