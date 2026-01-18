import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';
import { createId } from '@paralleldrive/cuid2';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { invite_code, user_id } = body;

    console.log("join 1 : ", invite_code);

    // 필수 값 체크
    if (!invite_code || !user_id) {
      return NextResponse.json({ 
        message: "필수 정보가 누락되었습니다." 
      }, { status: 400 });
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    // 1. 초대 코드로 워크스페이스 찾기
    const [workspaces]: any = await connection.execute(
      'SELECT id, name, owner_id FROM workspace WHERE invite_code = ?',
      [invite_code.trim()]
    );

    if (workspaces.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "유효하지 않은 초대 코드입니다." 
      }, { status: 404 });
    }

    const workspace = workspaces[0];

    // 2. 이미 멤버인지 확인
    const [existingMember]: any = await connection.execute(
      'SELECT id FROM ws_member WHERE workspaceId = ? AND user_id = ?',
      [workspace.id, user_id]
    );

    if (existingMember.length > 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ 
        message: "이미 참여 중인 워크스페이스입니다." 
      }, { status: 409 });
    }

    // 3. ws_member에 새 멤버 추가 (일반 member 역할)
    const memberQuery = `INSERT INTO ws_member (id, user_id, role, workspaceId) VALUES (?, ?, ?, ?)`;
    const memberId = createId();
    await connection.execute(memberQuery, [memberId, user_id, 'guest', workspace.id]);

    // 트랜잭션 커밋
    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      success: true,
      message: `'${workspace.name}' 워크스페이스에 참여했습니다.`,
      workspaceId: workspace.id,
      workspaceName: workspace.name
    }, { status: 200 });
  } catch (error) {
    await connection.rollback();
    connection.release();
    
    console.error("Workspace Join Error:", error);
    return NextResponse.json({ 
      message: "서버 오류가 발생했습니다." 
    }, { status: 500 });
  }
}