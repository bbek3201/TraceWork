import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { ensureOrgRoles } from "@/lib/roles";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "org"
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Мэдээллээ шалгаад дахин оруулна уу." }, { status: 400 });
  }
  const { name, organizationName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Энэ и-мэйл хаягаар аль хэдийн бүртгэгдсэн байна." }, { status: 409 });
  }

  const baseSlug = slugify(organizationName);
  let slug = baseSlug;
  for (let i = 1; await prisma.organization.findUnique({ where: { slug } }); i++) {
    slug = `${baseSlug}-${i}`;
  }

  // The organization must exist before roles (which are org-scoped) can be created, and role
  // seeding does many small upserts — both run outside the transaction so the transaction
  // itself only does the few org-member writes and stays well under the interactive-transaction
  // timeout on higher-latency (pooled/remote) connections.
  const organization = await prisma.organization.create({
    data: { name: organizationName, slug },
  });
  const roles = await ensureOrgRoles(organization.id);
  const adminRole = roles.get("ADMIN");
  if (!adminRole) throw new Error("ADMIN role could not be provisioned.");

  await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash: hashPassword(password) },
      });

      const member = await tx.organizationMember.create({
        data: { organizationId: organization.id, userId: user.id, status: "ACTIVE", jobTitle: "Админ" },
      });

      await tx.userRole.create({ data: { memberId: member.id, roleId: adminRole.id } });
    },
    { timeout: 15000 },
  );

  return NextResponse.json({ ok: true });
}
