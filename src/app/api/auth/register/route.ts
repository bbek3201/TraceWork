import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { hashPassword } from "@/lib/password";
import { PERMISSIONS, type AppRole } from "@/lib/permissions";
import { listUserIdsWithPermission } from "@/lib/queries";
import { ensureOrgRoles } from "@/lib/roles";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  organizationName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  inviteToken: z.string().trim().optional().or(z.literal("")),
  joinCode: z.string().trim().optional().or(z.literal("")),
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
  const { name, organizationName, email, password, inviteToken, joinCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Энэ и-мэйл хаягаар аль хэдийн бүртгэгдсэн байна." }, { status: 409 });
  }

  // Path 1: accepting an admin's email invitation — joins that specific organization
  // with the role the invitation was created with.
  if (inviteToken) {
    const invitation = await prisma.invitation.findUnique({ where: { token: inviteToken } });
    if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: "Урилга хүчингүй эсвэл хугацаа дууссан байна." }, { status: 400 });
    }
    if (invitation.email !== email) {
      return NextResponse.json({ error: "Урилгад заасан и-мэйл хаягаар бүртгүүлнэ үү." }, { status: 400 });
    }

    const roles = await ensureOrgRoles(invitation.organizationId);
    const targetRole = roles.get(invitation.role as AppRole) ?? roles.get("EMPLOYEE");
    if (!targetRole) throw new Error("Role could not be provisioned.");

    const { userId } = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({ data: { name, email, passwordHash: hashPassword(password) } });
        const member = await tx.organizationMember.create({
          data: { organizationId: invitation.organizationId, userId: user.id, status: "ACTIVE", jobTitle: invitation.jobTitle ?? undefined },
        });
        await tx.userRole.create({ data: { memberId: member.id, roleId: targetRole.id } });
        await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
        return { userId: user.id };
      },
      { timeout: 15000 },
    );

    const adminIds = await listUserIdsWithPermission(invitation.organizationId, PERMISSIONS.settingsManage);
    await notify(prisma, {
      organizationId: invitation.organizationId,
      userIds: adminIds.filter((id) => id !== userId),
      type: "member_joined",
      title: "Шинэ гишүүн нэгдлээ",
      body: `${name} (${email}) урилгыг хүлээн авч байгууллагад нэгдлээ.`,
    });

    return NextResponse.json({ ok: true });
  }

  // Path 2: joining via a company's shareable invite code — no per-email invitation needed.
  if (joinCode) {
    const organization = await prisma.organization.findUnique({ where: { inviteCode: joinCode } });
    if (!organization) {
      return NextResponse.json({ error: "Байгууллагын код буруу байна." }, { status: 400 });
    }

    const roles = await ensureOrgRoles(organization.id);
    const employeeRole = roles.get("EMPLOYEE");
    if (!employeeRole) throw new Error("EMPLOYEE role could not be provisioned.");

    const { userId } = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({ data: { name, email, passwordHash: hashPassword(password) } });
        const member = await tx.organizationMember.create({
          data: { organizationId: organization.id, userId: user.id, status: "ACTIVE" },
        });
        await tx.userRole.create({ data: { memberId: member.id, roleId: employeeRole.id } });
        return { userId: user.id };
      },
      { timeout: 15000 },
    );

    const adminIds = await listUserIdsWithPermission(organization.id, PERMISSIONS.settingsManage);
    await notify(prisma, {
      organizationId: organization.id,
      userIds: adminIds.filter((id) => id !== userId),
      type: "member_joined",
      title: "Шинэ гишүүн нэгдлээ",
      body: `${name} (${email}) компанийн кодоор байгууллагад нэгдлээ.`,
    });

    return NextResponse.json({ ok: true });
  }

  // Path 3 (default): create a brand-new organization — the registering user becomes its Admin.
  if (!organizationName) {
    return NextResponse.json({ error: "Байгууллагын нэрийг оруулна уу." }, { status: 400 });
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
