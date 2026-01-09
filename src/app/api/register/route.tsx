import { NextResponse } from 'next/server';
import pool from '@/app/lib/db'; // 위에서 만든 pool 불러오기
import { hashPassword } from '@/app/lib/encrypt'
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 구조 분해 할당 시 클라이언트에서 보낸 키 값과 일치해야 함
    const { userId, password, email, gender, birthDate } = body;

    // 필수 값 체크 (여기서 누락되면 400 에러를 명시적으로 던질 수 있음)
    if (!userId || !password || !email) {
      return NextResponse.json({ message: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    //비밀번호 암호화 SHA256 알고리즘 사용
    const encryptedPassword = hashPassword(password);

    const query = `INSERT INTO users (user_id, password, email, gender, birth) VALUES (?, ?, ?, ?, ?)`;
    await pool.execute(query, [userId, encryptedPassword, email, gender, birthDate]);

    return NextResponse.json({ isAccede: true }, { status: 200 });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}