// app/api/check-id/route.ts
import { NextResponse } from 'next/server';
import pool from '@/app/lib/db'; // 위에서 만든 pool 불러오기
import { hashPassword } from '@/app/lib/encrypt'

export async function POST(request: Request) {
  try {
    const { userData } = await request.json();

    if (!userData.username) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }

    if(!userData.password){
      return NextResponse.json({ error: 'PASSWORD가 필요합니다.' }, { status: 400 });
    }

    // DB 쿼리 실행
    const [rows]: any = await pool.execute(
      'SELECT user_id FROM users WHERE user_id = ? and password = ?', 
      [userData.username, hashPassword(userData.password)]
    );

    const isMember = rows.length > 0 ? true : false;

    return NextResponse.json({ isMember });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}