import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: Request) {
  // 트랜잭션을 위한 connection 객체
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { id, name, invite_code, owner_id, create_at } = body;

    // 필수 값 체크
    if (!id || !name || !invite_code || !owner_id) {
      return NextResponse.json({ 
        message: "필수 정보가 누락되었습니다." 
      }, { status: 400 });
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    // 워크스페이스 이름 중복 확인 (같은 소유자가 같은 이름의 워크스페이스를 만들 수 없도록)
    const [existing]: any = await connection.execute(
      'SELECT id FROM workspace WHERE owner_id = ? AND name = ?',
      [owner_id, name]
    );

    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "이미 같은 이름의 워크스페이스가 존재합니다." 
      }, { status: 409 });
    }

    // 1. 워크스페이스 생성
    const workspaceQuery = `INSERT INTO workspace (id, name, invite_code, owner_id) VALUES (?, ?, ?, ?)`;
    await connection.execute(workspaceQuery, [id, name, invite_code, owner_id]);

    // 2. ws_member에 생성자를 Admin으로 등록
    const memberQuery = `INSERT INTO ws_member (id, user_id, role, workspaceId) VALUES (?, ?, ?, ?)`;
    const memberId = createId();
    await connection.execute(memberQuery, [memberId, owner_id, 'admin', id]);

    // 트랜잭션 커밋
    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      isAccede: true,
      message: "워크스페이스가 성공적으로 생성되었습니다.",
      workspaceId: id
    }, { status: 200 });
  } catch (error) {
    // 오류 발생 시 롤백
    await connection.rollback();
    connection.release();
    
    console.error("Workspace Creation Error:", error);
    return NextResponse.json({ 
      message: "서버 오류가 발생했습니다." 
    }, { status: 500 });
  }
}