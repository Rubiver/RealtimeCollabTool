// app/api/register/route.ts
import { NextResponse } from 'next/server';
import pool from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    // 1. 프론트엔드에서 보낸 데이터 받기
    const { userId, password, name } = await request.json();

    // 2. 간단한 유효성 검사
    if (!userId || !password) {
      return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
    }

    // 3. MySQL INSERT 쿼리 실행
    // '?'는 SQL Injection 공격을 방지하기 위한 Prepared Statement 방식입니다.
    const query = 'INSERT INTO users (user_id, password, name) VALUES (?, ?, ?)';
    const values = [userId, password, name];

    const [result]: any = await pool.execute(query, values);

    // 4. 결과 반환 (insertId는 새로 생성된 PK 값입니다)
    return NextResponse.json({ 
      success: true, 
      message: '회원가입이 완료되었습니다.',
      insertedId: result.insertId 
    });

  } catch (error: any) {
    console.error('Registration Error:', error);
    
    // 에러 처리 (예: 아이디가 그 사이에 중복된 경우 등)
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: '이미 존재하는 아이디입니다.' }, { status: 409 });
    }

    return NextResponse.json({ error: '데이터 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}