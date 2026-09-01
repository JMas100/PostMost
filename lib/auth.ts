import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { normalizeEmail } from "./email";
import { checkRateLimit } from "./rate-limit";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_PER_EMAIL = 10;
const LOGIN_MAX_PER_IP = 20;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // This route runs through the Pages Router (pages/api/auth/[...nextauth].ts), so
        // next/headers isn't available here -- the IP has to come from next-auth's own req.
        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip = typeof forwardedFor === "string" ? forwardedFor.split(",")[0].trim() : undefined;

        const email = normalizeEmail(credentials.email);
        // Per-email stops sustained guessing against one target account; per-IP catches the
        // same attacker spraying guesses across many different accounts. Checked independently
        // so either one alone is enough to block. A block returns null -- the same generic
        // failure as a wrong password, so it leaks no extra signal.
        const emailCheck = await checkRateLimit(`login-email:${email}`, { windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_PER_EMAIL });
        if (!emailCheck.allowed) return null;
        if (ip) {
          const ipCheck = await checkRateLimit(`login-ip:${ip}`, { windowMs: LOGIN_WINDOW_MS, max: LOGIN_MAX_PER_IP });
          if (!ipCheck.allowed) return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.role) session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
