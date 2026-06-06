PRAGMA foreign_keys=OFF;

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "budgetRub" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'active',
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_year_month_idx" ON "Campaign"("year", "month");

INSERT INTO "Campaign" ("id", "name", "month", "year", "budgetRub", "status", "note", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(16))), 'Июнь 2026', 6, 2026, 0, 'active', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Campaign" WHERE "name" = 'Июнь 2026'
);

CREATE TABLE "new_Placement" (
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
  "campaignId" TEXT,
  CONSTRAINT "Placement_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Placement_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Placement_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Placement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Placement" (
  "id",
  "platform",
  "format",
  "priceRub",
  "plannedAt",
  "actualAt",
  "postNumber",
  "status",
  "postUrl",
  "referralUrl",
  "note",
  "sourceFile",
  "sourceSheet",
  "sourceRow",
  "createdAt",
  "updatedAt",
  "channelId",
  "networkId",
  "managerId",
  "campaignId"
)
SELECT
  "id",
  "platform",
  "format",
  "priceRub",
  "plannedAt",
  "actualAt",
  "postNumber",
  "status",
  "postUrl",
  "referralUrl",
  "note",
  "sourceFile",
  "sourceSheet",
  "sourceRow",
  "createdAt",
  "updatedAt",
  "channelId",
  "networkId",
  "managerId",
  (SELECT "id" FROM "Campaign" WHERE "name" = 'Июнь 2026' LIMIT 1)
FROM "Placement";

DROP TABLE "Placement";
ALTER TABLE "new_Placement" RENAME TO "Placement";

CREATE UNIQUE INDEX "Placement_channelId_plannedAt_platform_networkId_postNumber_key" ON "Placement"("channelId", "plannedAt", "platform", "networkId", "postNumber");
CREATE INDEX "Placement_campaignId_idx" ON "Placement"("campaignId");
CREATE INDEX "Placement_plannedAt_idx" ON "Placement"("plannedAt");
CREATE INDEX "Placement_status_idx" ON "Placement"("status");

PRAGMA foreign_keys=ON;
