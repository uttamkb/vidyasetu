import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./db";

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: "Demo Account",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email || "").toLowerCase();
      const password = String(credentials?.password || "");

      if (email !== "student@example.com" || password !== "password") {
        return null;
      }

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: "Demo Student",
          image: null,
        },
        create: {
          email,
          name: "Demo Student",
          image: null,
          grade: "9",
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  debug: true,
    callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            grade: "9",
          },
        });
        token.id = dbUser.id;
      } else if (user) {
        token.id = user.id;
      }

      // Fetch user from DB to get isOnboarded status
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { isOnboarded: true },
      });
      token.isOnboarded = dbUser?.isOnboarded ?? false;

      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.user.isOnboarded = token.isOnboarded as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
