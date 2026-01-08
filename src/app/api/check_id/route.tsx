// app/api/check-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/app/lib/db'; // 위에서 만든 pool 불러오기

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    // DB 쿼리 실행
    const [rows]: any = await pool.execute(
      'SELECT user_id FROM users WHERE user_id = ?', 
      [userId]
    );

    const isDuplicate = rows.length > 0;

    return NextResponse.json({ isDuplicate });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}