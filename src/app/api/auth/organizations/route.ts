import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/**
 * Verifies credentials and returns the organizations this account can sign into.
 * The client uses this to decide whether to sign in directly (single org) or show
 * a company picker (multiple orgs) before completing NextAuth's credentials sign-in.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Мэдээллээ шалгаад дахин оруулна уу." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { organization: true },
        orderBy: { organization: { name: "asc" } },
      },
    },
  });

  if (!user?.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "И-мэйл эсвэл нууц үг буруу байна." }, { status: 401 });
  }
  if (user.memberships.length === 0) {
    return NextResponse.json({ error: "Идэвхтэй байгууллагад харьяалагдаагүй байна." }, { status: 403 });
  }

  return NextResponse.json({
    organizations: user.memberships.map((m) => ({ id: m.organizationId, name: m.organization.name })),
  });
}
