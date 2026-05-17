import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

type UserRole = "STUDENT" | "ADMIN" | "SUPER_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isOnboarded: boolean;
      role?: UserRole;
      isActive?: boolean;
      state?: string | null;
      district?: string | null;
      school?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    isActive?: boolean;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isOnboarded?: boolean;
    role?: UserRole;
    isActive?: boolean;
    state?: string | null;
    district?: string | null;
    school?: string | null;
  }
}
