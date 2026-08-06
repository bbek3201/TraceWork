import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

export async function saveUploadedFile(file: File) {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const storageKey = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_ROOT, storageKey), buffer);
  return {
    storageKey,
    fileName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
    size: buffer.length,
  };
}

export function readUploadedFile(storageKey: string) {
  return readFile(path.join(UPLOAD_ROOT, storageKey));
}
