import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Redis를 직접 설정값으로 초기화 (가장 확실한 방법)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { email, inputCode } = await req.json();

    // 1. Redis에서 값 조회 (string 타입으로 명시)
    // Upstash에서 숫자로 저장되었더라도 문자열로 비교하기 위해 캐스팅이 필요할 수 있습니다.
    const savedCode = await redis.get(email);

    console.log(`[Verify] 이메일: ${email}, 입력값: ${inputCode}, 저장된값: ${savedCode}`);

    if (!savedCode) {
      return NextResponse.json({ error: "인증번호가 만료되었거나 없습니다." }, { status: 400 });
    }

    // 2. 타입에 상관없이 비교하기 위해 양쪽 다 문자열로 변환 후 비교
    if (String(savedCode) === String(inputCode)) {
      // 인증 성공 시 즉시 삭제 (보안 및 중복 방지)
      await redis.del(email);
      return NextResponse.json({ success: true, message: "인증 성공" });
    } else {
      return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "서버 오류 발생" }, { status: 500 });
  }
}