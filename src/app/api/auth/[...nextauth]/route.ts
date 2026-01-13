import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
//import { PrismaClient } from "../../../../../node_modules/.prisma/client";
import { prisma } from "@/app/lib/prisma";

// PrismaClient 인스턴스 생성 (에러 방지를 위해 하나만 유지)
//const prisma = new PrismaClient();

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
      },
      from: "onboarding@resend.dev", // Resend 무료 티어용 발신 주소
    }),
  ],
  session: {
    strategy: "database", // MySQL에 세션을 저장하는 방식
  },
  callbacks: {
    async session({ session, user }) {
      // 세션에 유저 ID를 포함시킵니다.
      if (session.user) {
        // @ts-ignore (타입 선언 파일이 없을 경우 일시적으로 경고 무시)
        session.user.id = user.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };