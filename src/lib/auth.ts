import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        organizationId: { label: "Organization", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { organization: true, roles: { include: { role: true } } },
              orderBy: { organization: { name: "asc" } },
            },
          },
        });
        if (!user?.passwordHash) return null;
        if (!verifyPassword(credentials.password, user.passwordHash)) return null;

        // Most accounts belong to exactly one active organization, so the org picker step
        // is skipped and this just falls back to the first membership. When a user has been
        // invited into more than one, the client resolves the choice via /api/auth/organizations
        // and passes it back here as `organizationId`.
        const membership = credentials.organizationId
          ? user.memberships.find((m) => m.organizationId === credentials.organizationId)
          : user.memberships[0];
        if (!membership) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: membership.organizationId,
          organizationName: membership.organization.name,
          memberId: membership.id,
          role: membership.roles[0]?.role.name ?? "EMPLOYEE",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          organizationId: string;
          organizationName: string;
          memberId: string;
          role: string;
        };
        token.organizationId = u.organizationId;
        token.organizationName = u.organizationName;
        token.memberId = u.memberId;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.organizationId = token.organizationId as string;
        session.user.organizationName = token.organizationName as string;
        session.user.memberId = token.memberId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
