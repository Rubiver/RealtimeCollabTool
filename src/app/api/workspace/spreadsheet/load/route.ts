import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json({ 
        error: 'workspaceId가 필요합니다.' 
      }, { status: 400 });
    }

    // 워크스페이스의 스프레드시트 데이터 조회
    const [rows]: any = await pool.execute(
      'SELECT data, updated_at FROM spreadsheet_data WHERE workspace_id = ?',
      [workspaceId]
    );

    if (rows.length === 0) {
      // 데이터가 없으면 기본 구조 반환
      return NextResponse.json({ 
        data: [
          {
            name: 'Sheet1',
            celldata: [],
            row: 50,
            column: 26,
          },
        ],
        exists: false
      });
    }

    // JSON 파싱
    const spreadsheetData = JSON.parse(rows[0].data);

    return NextResponse.json({ 
      data: spreadsheetData,
      exists: true,
      updatedAt: rows[0].updated_at
    });
  } catch (error) {
    console.error('Spreadsheet Load Error:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}