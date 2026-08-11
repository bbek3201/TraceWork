import { NextResponse } from "next/server";
import { getInvitationByToken } from "@/lib/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);
  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return NextResponse.json({ error: "Урилга хүчингүй эсвэл хугацаа дууссан байна." }, { status: 404 });
  }
  return NextResponse.json({ email: invitation.email, organizationName: invitation.organization.name });
}
