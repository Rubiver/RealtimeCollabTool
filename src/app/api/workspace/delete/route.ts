import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: Request) {
  // 트랜잭션을 위한 connection 객체
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { workspaceId } = body;

    // 트랜잭션 시작
    await connection.beginTransaction();

    // 워크스페이스 이름 중복 확인 (같은 소유자가 같은 이름의 워크스페이스를 만들 수 없도록)
    const [existing]: any = await connection.execute(
      'SELECT id FROM workspace WHERE workspaceId = ?',
      [workspaceId]
    );

    if (existing.length > 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "이미 같은 이름의 워크스페이스가 존재합니다." 
      }, { status: 409 });
    }

    // 1. 워크스페이스 삭제
    const workspaceQuery = `DELETE FROM workspace WHERE id = ?`;
    await connection.execute(workspaceQuery, [existing]);

    // 트랜잭션 커밋
    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      isAccede: true,
      message: "워크스페이스가 성공적으로 생성되었습니다.",
      workspaceId: existing
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