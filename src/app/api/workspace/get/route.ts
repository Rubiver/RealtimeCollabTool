// app/api/workspace/get/route.ts
import { NextResponse } from 'next/server';
import pool from '@/app/lib/db'; // 위에서 만든 pool 불러오기

export async function POST(request: Request) {
  try {
    const username = await request.json();
    const name = username.storedUsername;
    if (!name) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }
    console.log("workspace/get ", name);
    // DB 쿼리 실행
    const [rows]: any = await pool.execute(
      `SELECT * FROM workspace WHERE owner_id = ?`,
      [name.trim()]
    );

    console.log("workspace/get data : ",rows);

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}