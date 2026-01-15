import { NextResponse } from 'next/server';
import pool from '@/app/lib/db'; // 위에서 만든 pool 불러오기
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 구조 분해 할당 시 클라이언트에서 보낸 키 값과 일치해야 함
    const { name, invite_code, owener_id, create_at } = body;
    const id = createId();

    // 필수 값 체크 (여기서 누락되면 400 에러를 명시적으로 던질 수 있음)
    if (!name || !owener_id) {
      return NextResponse.json({ message: "필수 정보가 누락되었습니다." }, { status: 400 });
    }

    const query = `INSERT INTO workspace (id, name, invite_code, owner_id) VALUES (?, ?, ?, ?)`;
    await pool.execute(query, [id, name, invite_code, owener_id]);

    return NextResponse.json({ isAccede: true }, { status: 200 });
  } catch (error) {
    console.error("Registration Error:", error);
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}