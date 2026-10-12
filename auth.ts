import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { syncGoogleUser } from "./app/lib/syncGoogleUser";

// Session configuration: enforce JWT sessions and a reasonable expiration
// maxAge is in seconds. Here: half day (12 * 60 * 60)
const halfDayInSeconds = 12 * 60 * 60;

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: halfDayInSeconds,
  },
  jwt: {
    maxAge: halfDayInSeconds,
  },
  // Ensure NEXTAUTH_SECRET is used (should be set in env). Fall back to AUTH_SECRET if present.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

  callbacks: {
    async signIn({ account, profile, user }) {
      if (
        account?.provider !== "google" ||
        !(profile as { email_verified?: boolean })?.email_verified ||
        !user.email ||
        !account.id_token
      )
        return false;
      try {
        const synced = await syncGoogleUser(
          account.id_token,
          user.email,
          user.name,
        );
        user.id = synced.id;
        return true;
      } catch {
        console.error("No se pudo verificar Google en Supabase Auth");
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      return session;
    },
  },
});
