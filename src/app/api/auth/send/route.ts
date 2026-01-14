import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// 1. 환경 변수가 로드되지 않는 문제를 방지하기 위해 명시적으로 할당합니다.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // 환경 변수 디버깅 (터미널에서 확인용)
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      console.error("❌ 환경변수 UPSTASH_REDIS_REST_URL이 없습니다.");
    }

    const { email } = await req.json();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Redis에 저장
    await redis.set(email, code, { ex: 300 });

    // 이메일 발송
    await resend.emails.send({
      from: 'Slack Clone <onboarding@resend.dev>',
      to: email,
      subject: '[Slack Clone] 인증 번호',
      html: `<strong>${code}</strong>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: '인증 실패' }, { status: 500 });
  }
}