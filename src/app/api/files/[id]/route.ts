import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUploadedFile } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return Response.json({ error: "Нэвтрээгүй байна." }, { status: 401 });

  const asset = await prisma.fileAsset.findUnique({
    where: { id },
    include: { evidence: { include: { task: true }, take: 1 } },
  });
  const task = asset?.evidence[0]?.task;
  if (!asset || !task || task.organizationId !== session.user.organizationId) {
    return Response.json({ error: "Файл олдсонгүй." }, { status: 404 });
  }

  const buffer = await readUploadedFile(asset.storageKey);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.fileName)}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
