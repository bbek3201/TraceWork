import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      organizationId: string;
      organizationName: string;
      memberId: string;
      role: string;
    };
  }

  interface User {
    organizationId: string;
    organizationName: string;
    memberId: string;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string;
    organizationName?: string;
    memberId?: string;
    role?: string;
  }
}
