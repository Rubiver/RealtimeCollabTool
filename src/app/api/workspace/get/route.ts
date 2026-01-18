// app/api/workspace/get/route.ts
import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const username = await request.json();
    const name = username.storedUsername;
    
    if (!name) {
      return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
    }
    
    console.log("workspace/get ", name);
    
    // ws_member 테이블을 통해 사용자가 속한 워크스페이스 조회
    // JOIN을 사용하여 워크스페이스 정보와 사용자 역할을 함께 가져옴
    const [rows]: any = await pool.execute(
      `SELECT 
        w.id,
        w.name,
        w.invite_code,
        w.owner_id,
        w.create_at,
        wm.role,
        wm.id as member_id
      FROM workspace w
      INNER JOIN ws_member wm ON w.id = wm.workspaceId
      WHERE wm.user_id = ?
      ORDER BY w.create_at DESC`,
      [name.trim()]
    );

    console.log("workspace/get data : ", rows);

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}