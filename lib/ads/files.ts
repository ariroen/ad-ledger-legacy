import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function uploadsDir() {
  return process.env.ADS_UPLOAD_DIR ?? path.join(process.cwd(), "outputs", "ad-ledger-uploads");
}

export function backupsDir() {
  return process.env.ADS_BACKUP_DIR ?? path.join(process.cwd(), "outputs", "ad-ledger-backups");
}

export function databasePathFromUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.sqlite";
  if (!raw.startsWith("file:")) return null;
  const filePath = raw.slice("file:".length);
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

export async function saveUpload(file: File, folder = "files") {
  const dir = path.join(uploadsDir(), folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "_");
  const fileName = `${Date.now()}_${randomUUID()}_${safeName}`;
  const filePath = path.join(dir, fileName);
  await fs.promises.writeFile(filePath, Buffer.from(await file.arrayBuffer()));
  return filePath;
}
