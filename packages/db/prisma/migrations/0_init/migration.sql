-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'member');

-- CreateEnum
CREATE TYPE "LoginMode" AS ENUM ('none', 'credentials');

-- CreateEnum
CREATE TYPE "ConnectedAppStatus" AS ENUM ('connected', 'error', 'disabled');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('discovered', 'requested', 'ready', 'archived');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('queued', 'capturing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('howto', 'marketing');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('draft', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "Freshness" AS ENUM ('live', 'stale');

-- CreateEnum
CREATE TYPE "RenderAspect" AS ENUM ('16:9', '9:16', '1:1');

-- CreateEnum
CREATE TYPE "RenderStatus" AS ENUM ('queued', 'rendering', 'done', 'failed');

-- CreateEnum
CREATE TYPE "AgentRequestStatus" AS ENUM ('planning', 'capturing', 'rendering', 'done', 'failed', 'needs_input');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'active', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "UsageEventKind" AS ENUM ('capture_minutes', 'agent_run', 'render', 'regenerate');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedApp" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "loginMode" "LoginMode" NOT NULL DEFAULT 'none',
    "credentialsRef" TEXT,
    "pronunciation" JSONB,
    "lastSnapshotId" TEXT,
    "status" "ConnectedAppStatus" NOT NULL DEFAULT 'connected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "connectedAppId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent" TEXT,
    "stepsJson" JSONB,
    "status" "FlowStatus" NOT NULL DEFAULT 'discovered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capture" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "browserbaseSessionId" TEXT,
    "rawVideoKey" TEXT,
    "domSnapshotKey" TEXT,
    "visualSnapshotKey" TEXT,
    "durationMs" INTEGER,
    "status" "CaptureStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "connectedAppId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "captureId" TEXT,
    "type" "VideoType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'draft',
    "currentRenderId" TEXT,
    "freshness" "Freshness" NOT NULL DEFAULT 'live',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Render" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "mp4Key" TEXT,
    "thumbKey" TEXT,
    "aspect" "RenderAspect" NOT NULL DEFAULT '16:9',
    "scriptJson" JSONB,
    "captionsKey" TEXT,
    "durationMs" INTEGER,
    "status" "RenderStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Render_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiSnapshot" (
    "id" TEXT NOT NULL,
    "connectedAppId" TEXT NOT NULL,
    "routeMapJson" JSONB,
    "visualHashes" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StalenessEvent" (
    "id" TEXT NOT NULL,
    "connectedAppId" TEXT NOT NULL,
    "snapshotBeforeId" TEXT,
    "snapshotAfterId" TEXT,
    "diffJson" JSONB,
    "affectedVideoIds" TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StalenessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "connectedAppId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "parsedIntentJson" JSONB,
    "planJson" JSONB,
    "progressJson" JSONB,
    "question" TEXT,
    "lastError" TEXT,
    "resultVideoId" TEXT,
    "status" "AgentRequestStatus" NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadJson" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "UsageEventKind" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_stripeCustomerId_idx" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Secret_workspaceId_idx" ON "Secret"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "ConnectedApp_workspaceId_idx" ON "ConnectedApp"("workspaceId");

-- CreateIndex
CREATE INDEX "ConnectedApp_status_idx" ON "ConnectedApp"("status");

-- CreateIndex
CREATE INDEX "Flow_connectedAppId_idx" ON "Flow"("connectedAppId");

-- CreateIndex
CREATE INDEX "Flow_status_idx" ON "Flow"("status");

-- CreateIndex
CREATE INDEX "Capture_flowId_idx" ON "Capture"("flowId");

-- CreateIndex
CREATE INDEX "Capture_status_idx" ON "Capture"("status");

-- CreateIndex
CREATE INDEX "Video_connectedAppId_idx" ON "Video"("connectedAppId");

-- CreateIndex
CREATE INDEX "Video_flowId_idx" ON "Video"("flowId");

-- CreateIndex
CREATE INDEX "Video_captureId_idx" ON "Video"("captureId");

-- CreateIndex
CREATE INDEX "Video_freshness_idx" ON "Video"("freshness");

-- CreateIndex
CREATE INDEX "Render_videoId_idx" ON "Render"("videoId");

-- CreateIndex
CREATE INDEX "Render_status_idx" ON "Render"("status");

-- CreateIndex
CREATE INDEX "UiSnapshot_connectedAppId_idx" ON "UiSnapshot"("connectedAppId");

-- CreateIndex
CREATE INDEX "StalenessEvent_connectedAppId_idx" ON "StalenessEvent"("connectedAppId");

-- CreateIndex
CREATE INDEX "StalenessEvent_resolvedAt_idx" ON "StalenessEvent"("resolvedAt");

-- CreateIndex
CREATE INDEX "AgentRequest_workspaceId_idx" ON "AgentRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "AgentRequest_connectedAppId_idx" ON "AgentRequest"("connectedAppId");

-- CreateIndex
CREATE INDEX "AgentRequest_status_idx" ON "AgentRequest"("status");

-- CreateIndex
CREATE INDEX "Job_type_idx" ON "Job"("type");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "UsageEvent_workspaceId_idx" ON "UsageEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "UsageEvent_kind_idx" ON "UsageEvent"("kind");

-- CreateIndex
CREATE INDEX "UsageEvent_createdAt_idx" ON "UsageEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectedApp" ADD CONSTRAINT "ConnectedApp_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_connectedAppId_fkey" FOREIGN KEY ("connectedAppId") REFERENCES "ConnectedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Capture" ADD CONSTRAINT "Capture_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_connectedAppId_fkey" FOREIGN KEY ("connectedAppId") REFERENCES "ConnectedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_captureId_fkey" FOREIGN KEY ("captureId") REFERENCES "Capture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UiSnapshot" ADD CONSTRAINT "UiSnapshot_connectedAppId_fkey" FOREIGN KEY ("connectedAppId") REFERENCES "ConnectedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StalenessEvent" ADD CONSTRAINT "StalenessEvent_connectedAppId_fkey" FOREIGN KEY ("connectedAppId") REFERENCES "ConnectedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRequest" ADD CONSTRAINT "AgentRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRequest" ADD CONSTRAINT "AgentRequest_connectedAppId_fkey" FOREIGN KEY ("connectedAppId") REFERENCES "ConnectedApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

