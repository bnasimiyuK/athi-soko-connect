// app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // This imports the config we built earlier

// NextAuth takes your configuration and creates a handler function
const handler = NextAuth(authOptions);

// Next.js App Router requires you to export the handler for GET and POST requests
export { handler as GET, handler as POST };