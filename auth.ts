import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

// Session configuration: enforce JWT sessions and a reasonable expiration
// maxAge is in seconds. Here: half day (12 * 60 * 60)
const halfDayInSeconds = 12 * 60 * 60

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
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope:
            'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/gmail.send',
        },
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: halfDayInSeconds,
  },
  jwt: {
    maxAge: halfDayInSeconds,
  },
  // Ensure NEXTAUTH_SECRET is used (should be set in env). Fall back to AUTH_SECRET if present.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token as string | undefined
        token.refreshToken = account.refresh_token as string | undefined
        token.idToken = account.id_token as string | undefined
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      session.idToken = token.idToken as string | undefined

      // Ensure session.expires is set and respects maxAge
      try {
        // Assign ISO string to expires using a safe cast to avoid TS type mismatch
        ;(session as any).expires = new Date(
          Date.now() + halfDayInSeconds * 1000
        ).toISOString()
      } catch (e) {
        console.warn('Could not set session.expires', e)
      }

      return session
    },
  },
})
