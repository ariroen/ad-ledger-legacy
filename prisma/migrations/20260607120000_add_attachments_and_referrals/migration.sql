PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Attachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "fileName" TEXT,
  "filePath" TEXT,
  "mimeType" TEXT,
  "fileId" TEXT,
  "fileSize" INTEGER,
  "source" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "telegramMessageId" TEXT,
  "invoiceId" TEXT,
  "campaignId" TEXT,
  "placementId" TEXT,
  CONSTRAINT "Attachment_telegramMessageId_fkey" FOREIGN KEY ("telegramMessageId") REFERENCES "TelegramMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Attachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Attachment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Attachment_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Attachment" (
  "id",
  "kind",
  "fileName",
  "filePath",
  "mimeType",
  "fileId",
  "createdAt",
  "telegramMessageId",
  "invoiceId"
)
SELECT
  "id",
  "kind",
  "fileName",
  "filePath",
  "mimeType",
  "fileId",
  "createdAt",
  "telegramMessageId",
  "invoiceId"
FROM "Attachment";

DROP TABLE "Attachment";
ALTER TABLE "new_Attachment" RENAME TO "Attachment";

CREATE INDEX "Attachment_campaignId_idx" ON "Attachment"("campaignId");
CREATE INDEX "Attachment_placementId_idx" ON "Attachment"("placementId");

CREATE TABLE "ReferralLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "clicksCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "channelId" TEXT,
  "campaignId" TEXT,
  "placementId" TEXT,
  CONSTRAINT "ReferralLink_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReferralLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ReferralLink_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "Placement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE INDEX "ReferralLink_channelId_idx" ON "ReferralLink"("channelId");
CREATE INDEX "ReferralLink_campaignId_idx" ON "ReferralLink"("campaignId");
CREATE INDEX "ReferralLink_placementId_idx" ON "ReferralLink"("placementId");
CREATE INDEX "ReferralLink_status_idx" ON "ReferralLink"("status");

CREATE TABLE "ReferralEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "referrer" TEXT,
  "ipHash" TEXT,
  "referralLinkId" TEXT NOT NULL,
  CONSTRAINT "ReferralEvent_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ReferralEvent_referralLinkId_createdAt_idx" ON "ReferralEvent"("referralLinkId", "createdAt");

PRAGMA foreign_keys=ON;
