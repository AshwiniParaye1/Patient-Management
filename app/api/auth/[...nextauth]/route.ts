import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/drive.file",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
          ].join(" "),
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  debug: true, // Enable debug logs
  callbacks: {
    async session({ session, token }) {
      console.log("Session callback - token:", token);
      if (session) {
        // Add user ID if available
        if (token.sub) {
          session.user.id = token.sub;
        }

        // Add access token to session
        session.accessToken = token.accessToken;
        console.log("Added access token to session:", session.accessToken);
      }
      return session;
    },
    async jwt({ token, account, user }) {
      console.log("JWT callback - account:", account);

      // Initial sign in
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000, // 1 hour default
        };
      }

      // Return previous token if the access token has not expired yet
      if (
        token.accessTokenExpires &&
        Date.now() < (token.accessTokenExpires as number)
      ) {
        return token;
      }

      // Access token has expired, try to update it
      // Note: Refresh token logic would go here if needed
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
