import { User as NextAuthUser } from "next-auth";


declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
  }

  interface User extends NextAuthUser {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  }
}
