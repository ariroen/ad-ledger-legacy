PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'manager',
  "passwordHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Manager" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "username" TEXT,
  "source" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Network" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "priceRub" INTEGER,
  "format" TEXT,
  "networkUrl" TEXT,
  "compositionStatus" TEXT NOT NULL DEFAULT 'active',
  "source" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Channel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "url" TEXT,
  "statsUrl" TEXT,
  "source" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "networkId" TEXT,
  CONSTRAINT "Channel_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Placement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "platform" TEXT NOT NULL,
  "format" TEXT,
  "priceRub" INTEGER,
  "plannedAt" DATETIME,
  "actualAt" DATETIME,
  "postNumber" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "postUrl" TEXT,
  "referralUrl" TEXT,
  "note" TEXT,
  "sourceFile" TEXT,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "channelId" TEXT NOT NULL,
  "networkId" TEXT,
  "managerId" TEXT,
  CONSTRAINT "Placement_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Placement_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Placement_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlacementProof" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "url" TEXT,
  "filePath" TEXT,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "placementId" TEXT NOT NULL,
  CONSTRAINT "PlacementProof_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "TelegramMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "telegramMessageId" INTEGER NOT NULL,
  "chatId" TEXT NOT NULL,
  "senderName" TEXT,
  "senderUsername" TEXT,
  "forwardedFrom" TEXT,
  "text" TEXT,
  "receivedAt" DATETIME NOT NULL,
  "rawJson" TEXT NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
  "suggestedActions" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "fileName" TEXT,
  "filePath" TEXT,
  "mimeType" TEXT,
  "fileId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "telegramMessageId" TEXT,
  "invoiceId" TEXT,
  CONSTRAINT "Attachment_telegramMessageId_fkey" FOREIGN KEY ("telegramMessageId") REFERENCES "TelegramMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Attachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "number" TEXT,
  "issuedAt" DATETIME,
  "contractor" TEXT,
  "amountRub" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'expected',
  "filePath" TEXT,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "amountRub" INTEGER NOT NULL,
  "paidAt" DATETIME,
  "method" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "invoiceId" TEXT,
  "placementId" TEXT,
  "networkId" TEXT,
  CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Payment_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Payment_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "before" TEXT,
  "after" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ProposedChange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "actionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "payloadJson" TEXT NOT NULL,
  "confidence" REAL,
  "requiresCheckReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedAt" DATETIME,
  "createdById" TEXT,
  "approvedById" TEXT,
  "telegramMessageId" TEXT,
  "invoiceId" TEXT,
  CONSTRAINT "ProposedChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProposedChange_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ProposedChange_telegramMessageId_fkey" FOREIGN KEY ("telegramMessageId") REFERENCES "TelegramMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProposedChange_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ImportRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "addedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "requiresCheckCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "summaryJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorId" TEXT,
  CONSTRAINT "ImportRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ImportRunItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "action" TEXT NOT NULL,
  "sourceSheet" TEXT,
  "sourceRow" INTEGER,
  "message" TEXT,
  "requiresCheck" BOOLEAN NOT NULL DEFAULT false,
  "requiresCheckReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "importRunId" TEXT NOT NULL,
  "placementId" TEXT,
  CONSTRAINT "ImportRunItem_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ImportRunItem_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "BackupSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "filePath" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Manager_name_key" ON "Manager"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Network_name_platform_key" ON "Network"("name", "platform");
CREATE INDEX IF NOT EXISTS "Network_platform_idx" ON "Network"("platform");
CREATE UNIQUE INDEX IF NOT EXISTS "Channel_platform_normalizedName_url_key" ON "Channel"("platform", "normalizedName", "url");
CREATE INDEX IF NOT EXISTS "Channel_platform_normalizedName_idx" ON "Channel"("platform", "normalizedName");
CREATE UNIQUE INDEX IF NOT EXISTS "Placement_channelId_plannedAt_platform_networkId_postNumber_key" ON "Placement"("channelId", "plannedAt", "platform", "networkId", "postNumber");
CREATE INDEX IF NOT EXISTS "Placement_plannedAt_idx" ON "Placement"("plannedAt");
CREATE INDEX IF NOT EXISTS "Placement_status_idx" ON "Placement"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "TelegramMessage_telegramMessageId_chatId_key" ON "TelegramMessage"("telegramMessageId", "chatId");
CREATE INDEX IF NOT EXISTS "TelegramMessage_reviewStatus_idx" ON "TelegramMessage"("reviewStatus");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "ProposedChange_status_idx" ON "ProposedChange"("status");
CREATE INDEX IF NOT EXISTS "ProposedChange_sourceType_sourceId_idx" ON "ProposedChange"("sourceType", "sourceId");
CREATE INDEX IF NOT EXISTS "ProposedChange_actionType_idx" ON "ProposedChange"("actionType");
CREATE INDEX IF NOT EXISTS "ImportRun_createdAt_idx" ON "ImportRun"("createdAt");
CREATE INDEX IF NOT EXISTS "ImportRun_source_idx" ON "ImportRun"("source");
CREATE INDEX IF NOT EXISTS "ImportRunItem_entity_entityId_idx" ON "ImportRunItem"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "ImportRunItem_requiresCheck_idx" ON "ImportRunItem"("requiresCheck");
CREATE INDEX IF NOT EXISTS "BackupSnapshot_createdAt_idx" ON "BackupSnapshot"("createdAt");

PRAGMA foreign_keys=ON;
