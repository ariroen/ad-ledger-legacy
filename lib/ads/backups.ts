import fs from "node:fs";
import path from "node:path";
import { prisma } from "./db";
import { backupsDir, databasePathFromUrl } from "./files";

export async function createBackupSnapshot(kind: string, note?: string | null) {
  const dbPath = databasePathFromUrl();
  const dir = backupsDir();
  await fs.promises.mkdir(dir, { recursive: true });

  if (!dbPath || !fs.existsSync(dbPath)) {
    return prisma.backupSnapshot.create({
      data: {
        kind,
        status: "missing_source",
        filePath: "",
        note: note ?? "SQLite database file was not found",
      },
    });
  }

  const filePath = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}_${kind}.sqlite`);
  await fs.promises.copyFile(dbPath, filePath);
  return prisma.backupSnapshot.create({
    data: {
      kind,
      status: "created",
      filePath,
      note: note ?? null,
    },
  });
}

export async function getBackupSnapshots() {
  return prisma.backupSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 14,
  });
}
