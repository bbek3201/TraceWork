import { get, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

// Production (Vercel) uses private Blob storage; local dev without a token falls back to disk.
const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");
const BLOB_PREFIX = "uploads/";

function isBlobEnabled() {
  // Vercel connects stores via OIDC (BLOB_STORE_ID); older setups expose a read-write token.
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUploadedFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "application/octet-stream";
  let storageKey: string = randomUUID();

  if (isBlobEnabled()) {
    const blob = await put(`${BLOB_PREFIX}${storageKey}`, buffer, {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: true,
    });
    storageKey = blob.pathname;
  } else {
    await mkdir(UPLOAD_ROOT, { recursive: true });
    await writeFile(path.join(UPLOAD_ROOT, storageKey), buffer);
  }

  return {
    storageKey,
    fileName: file.name || "file",
    mimeType,
    size: buffer.length,
  };
}

export async function readUploadedFile(storageKey: string) {
  if (!storageKey.startsWith(BLOB_PREFIX)) {
    return readFile(path.join(UPLOAD_ROOT, storageKey));
  }
  const result = await get(storageKey, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error("Файл олдсонгүй.");
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}
