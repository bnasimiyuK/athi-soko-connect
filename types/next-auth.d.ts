import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string | null;
    phone?: string | null;
  }
  interface Session {
    user: User & {
      role?: string | null;
      id?: string;
    };
  }
}