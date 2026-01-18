import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, invite_code, owner_id, create_at } = body;

    // 필수 값 체크
    if (!id || !name || !invite_code || !owner_id) {
      return NextResponse.json({ 
        message: "필수 정보가 누락되었습니다." 
      }, { status: 400 });
    }

    // 워크스페이스 이름 중복 확인 (같은 소유자가 같은 이름의 워크스페이스를 만들 수 없도록)
    const [existing]: any = await pool.execute(
      'SELECT id FROM workspace WHERE owner_id = ? AND name = ?',
      [owner_id, name]
    );

    if (existing.length > 0) {
      return NextResponse.json({ 
        message: "이미 같은 이름의 워크스페이스가 존재합니다." 
      }, { status: 409 });
    }

    // 워크스페이스 생성
    const query = `INSERT INTO workspace (id, name, invite_code, owner_id) VALUES (?, ?, ?, ?)`;
    await pool.execute(query, [id, name, invite_code, owner_id]);

    return NextResponse.json({ 
      isAccede: true,
      message: "워크스페이스가 성공적으로 생성되었습니다."
    }, { status: 200 });
  } catch (error) {
    console.error("Workspace Creation Error:", error);
    return NextResponse.json({ 
      message: "서버 오류가 발생했습니다." 
    }, { status: 500 });
  }
}