import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request Sheets scope + offline access for refresh tokens
          scope:
            "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent", // force consent so we always get a refresh token
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: store tokens from the OAuth response
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000,
        };
      }

      // Token still valid — return as-is
      if (Date.now() < (token.expiresAt as number) - 60_000) {
        return token;
      }

      // Token expired — attempt refresh
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw data;

        return {
          ...token,
          accessToken: data.access_token,
          expiresAt: Date.now() + data.expires_in * 1000,
          // refresh_token rotates only when Google sends a new one
          refreshToken: data.refresh_token ?? token.refreshToken,
        };
      } catch (err) {
        console.error("[Auth] Token refresh failed:", err);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },

    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
});
