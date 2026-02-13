import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github" && account.access_token) {
        try {
          await prisma.user.upsert({
            where: { githubId: account.providerAccountId },
            update: {
              email: user.email!,
              name: user.name,
              image: user.image,
              accessToken: account.access_token,
            },
            create: {
              email: user.email!,
              name: user.name,
              image: user.image,
              githubId: account.providerAccountId,
              accessToken: account.access_token,
            },
          });
          return true;
        } catch (error) {
          console.error("Error saving user:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.githubId = account.providerAccountId;
      }
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.githubId) {
        const dbUser = await prisma.user.findUnique({
          where: { githubId: token.githubId as string },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.accessToken = dbUser.accessToken;
          session.user.defaultOrganizationId = dbUser.defaultOrganizationId || undefined;
        }
      }
      // Pass active organization from token to session
      if (token.activeOrganizationId) {
        session.user.activeOrganizationId = token.activeOrganizationId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      accessToken: string;
      defaultOrganizationId?: string;
      activeOrganizationId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    githubId?: string;
    userId?: string;
    activeOrganizationId?: string;
  }
}
