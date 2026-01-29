import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  const connection = await pool.getConnection();
  
  try {
    const body = await request.json();
    const { workspaceId, data } = body;

    if (!workspaceId || !data) {
      return NextResponse.json({ 
        message: "필수 정보가 누락되었습니다." 
      }, { status: 400 });
    }

    await connection.beginTransaction();

    // 기존 데이터가 있는지 확인
    const [existing]: any = await connection.execute(
      'SELECT id FROM spreadsheet_data WHERE workspace_id = ?',
      [workspaceId]
    );

    // JSON 문자열로 변환
    const jsonData = JSON.stringify(data);

    if (existing.length > 0) {
      // 업데이트
      const updateQuery = `UPDATE spreadsheet_data SET data = ?, updated_at = NOW() WHERE workspace_id = ?`;
      await connection.execute(updateQuery, [jsonData, workspaceId]);
    } else {
      // 새로 삽입
      const insertQuery = `INSERT INTO spreadsheet_data (workspace_id, data, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`;
      await connection.execute(insertQuery, [workspaceId, jsonData]);
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({ 
      success: true,
      message: "스프레드시트가 저장되었습니다."
    }, { status: 200 });
  } catch (error) {
    await connection.rollback();
    connection.release();
    
    console.error("Spreadsheet Save Error:", error);
    return NextResponse.json({ 
      message: "서버 오류가 발생했습니다." 
    }, { status: 500 });
  }
}