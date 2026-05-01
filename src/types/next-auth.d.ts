import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isOnboarded: boolean;
      xp: number;
      level: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isOnboarded?: boolean;
    xp?: number;
    level?: string;
  }
}
