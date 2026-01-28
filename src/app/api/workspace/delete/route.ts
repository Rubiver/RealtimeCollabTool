import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { workspace_id, user_id } = body;

    // 필수 값 체크
    if (!workspace_id || !user_id) {
      return NextResponse.json({ 
        message: "필수 정보가 누락되었습니다." 
      }, { status: 400 });
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    // 1. 워크스페이스 소유자 확인
    const [workspaces]: any = await connection.execute(
      'SELECT owner_id FROM workspace WHERE id = ?',
      [workspace_id]
    );

    if (workspaces.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "워크스페이스를 찾을 수 없습니다." 
      }, { status: 404 });
    }

    const workspace = workspaces[0];

    // 2. 소유자인지 확인
    if (workspace.owner_id !== user_id) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "워크스페이스를 삭제할 권한이 없습니다. 소유자만 삭제할 수 있습니다." 
      }, { status: 403 });
    }

    // 3. ws_member에서 관련 멤버 삭제
    await connection.execute(
      'DELETE FROM ws_member WHERE workspaceId = ?',
      [workspace_id]
    );

    // 4. 워크스페이스 삭제
    await connection.execute(
      'DELETE FROM workspace WHERE id = ?',
      [workspace_id]
    );

    // 트랜잭션 커밋
    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      success: true,
      message: "워크스페이스가 성공적으로 삭제되었습니다."
    }, { status: 200 });
  } catch (error) {
    await connection.rollback();
    connection.release();
    
    console.error("Workspace Delete Error:", error);
    return NextResponse.json({ 
      message: "서버 오류가 발생했습니다." 
    }, { status: 500 });
  }
}