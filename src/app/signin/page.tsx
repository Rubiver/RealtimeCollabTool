'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'

export default function RegisterPage() {
  interface User{
    userId?: String;
    password?: String;
    email?: String;
    gender?: String;
    birthDate?: String;
  }

  //const [userData, setUserData] = useState<User>({});  
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [message, setMessage] = useState('');
  const { data: session, status } = useSession();

  useEffect(() => {
    // 세션이 존재하고 이메일이 입력한 이메일과 같다면 인증 성공 처리
    if (session?.user?.email === email) {
      setConfirmEmail(email);
      // console.log("이메일 인증 완료:", session.user.email);
    }
  }, [session, email]);
  
  // 아이디 중복 확인 상태 (Spring 연동 시 사용)
  const [isIdChecked, setIsIdChecked] = useState(false)

  const router = useRouter()

  // 비밀번호 정규식: 문자 최소 5개, 숫자 최소 2개, 특수문자 최소 1개
  // (?=(.*[a-zA-Z]){5,}) : 영문자 5개 이상
  // (?=(.*[0-9]){2,}) : 숫자 2개 이상
  // (?=(.*[!@#$%^&*()_+]){1,}) : 특수문자 1개 이상
  const passwordRegex = /^(?=(.*[a-zA-Z]){5,})(?=(.*[0-9]){2,})(?=(.*[!@#$%^&*()_+]){1,}).*$/;
  const isPasswordValid = passwordRegex.test(password);
  const isMatch = password === confirmPassword && confirmPassword.length > 0;

  // 이메일 확인 변수
  const isEmailConfirmed = confirmEmail !== '' ? confirmEmail  : '';

  // // 아이디 중복 확인 핸들러 (Spring API 호출용)
  // const handleCheckId = async () => {
  //   if (!userId.trim()) {
  //     alert("아이디를 입력해주세요.");
  //     return;
  //   }
  //   // TODO: Spring DB 검색 로직 연동
  //   // const response = await fetch(`/api/check-id?id=${userId}`);
  //   console.log(`${userId} 중복 확인 시도`);
  //   alert("사용 가능한 아이디입니다."); // 임시 처리
  //   setIsIdChecked(true);
  // }

  const handleRegister = async () => {
    if (!isIdChecked) {
      alert("아이디 중복 확인을 해주세요.");
      return;
    }
    if (!isPasswordValid) {
      alert("비밀번호 조건을 충족해주세요.");
      return;
    }
    if (!isMatch) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    const finalUserData: User = {
      userId,
      password,
      email,
      gender,
      birthDate: birthDate ? new Date(birthDate).toISOString().slice(0, 10) : undefined 
    };

    console.log("userdata : ", finalUserData);

    const reponse = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(finalUserData),
      headers: { 'Content-Type': 'application/json'},
    });

    const {isAccede} = await reponse.json();

    // 회원가입 성공 로직
    //console.log({ userId, password, email, gender, birthDate });
    alert("회원가입이 완료되었습니다!");
    router.push('/');
  }

  //회원 ID 중복 검사 로직
  const checkDuplicate = async () => {
    const response = await fetch('/api/check_id', {
      method: 'POST',
      body: JSON.stringify({ userId }),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const { isDuplicate } = await response.json();
    console.log(isDuplicate);

    if (isDuplicate) {
      setMessage('이미 사용 중인 아이디입니다.');
      alert(message);
    } else {
      setMessage('사용 가능한 아이디입니다.');
      setIsIdChecked(true);
      alert(message);
    }
  };

  const checkEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      alert("유효한 이메일 주소를 입력해주세요.");
      return;
    }

    try {
      // 1. NextAuth의 Email Provider 호출
      // redirect: false를 해야 페이지가 새로고침되지 않고 현재 페이지에 머뭅니다.
      const result = await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: window.location.href // 인증 완료 후 돌아올 주소 (현재 페이지)
      });

      if (result?.error) {
        console.error("Email error:", result.error);
        alert("이메일 발송 중 오류가 발생했습니다.");
      } else {
        alert("입력하신 이메일로 인증 링크를 보냈습니다.\n메일함을 확인하고 링크를 클릭해주세요!");
      }
    } catch (error) {
      console.error("CheckEmail Error:", error);
      alert("이메일 전송에 실패했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">회원가입</h1>
        
        <div className="space-y-5">
          {/* 아이디 입력 (중복 확인 포함) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setIsIdChecked(false); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                placeholder="아이디 입력"
              />
              <button 
                onClick={checkDuplicate}
                className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                중복 확인
              </button>
            </div>
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
              placeholder="문자 5+, 숫자 2+, 특수문자 1+"
            />
            {password.length > 0 && (
              <p className={`mt-1 text-xs ${isPasswordValid ? "text-green-600" : "text-red-500"}`}>
                {isPasswordValid ? "✓ 안전한 비밀번호입니다." : "✕ 문자 5개, 숫자 2개, 특수문자 1개 이상 포함해야 합니다."}
              </p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
              placeholder="비밀번호 다시 입력"
            />
            {confirmPassword.length > 0 && (
              <p className={`mt-1 text-xs ${isMatch ? "text-green-600" : "text-red-500"}`}>
                {isMatch ? "✓ 비밀번호가 일치합니다." : "✕ 비밀번호가 일치하지 않습니다."}
              </p>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
                placeholder="example@email.com"
              />
              <button 
                  onClick={checkEmail}
                  className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  이메일 확인
              </button>
            </div>
            {confirmEmail.length > 0 && (
              <p className={`mt-1 text-xs ${isMatch ? "text-green-600" : "text-red-500"}`}>
                {isMatch ? "✓ 이메일 인증 완료" : "✕ 이메일 인증 필요"}
              </p>
            )}   
          </div>

          {/* 성별 및 생년월일 (2열 배치) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
              >
                <option value="">선택</option>
                <option value="M">남성</option>
                <option value="F">여성</option>
                <option value="O">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900"
              />
            </div>
          </div>

          {/* 회원가입 버튼 */}
          <button
            onClick={handleRegister}
            disabled={!isIdChecked || !isPasswordValid || !isMatch || !isEmailConfirmed}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all mt-4"
          >
            회원가입 하기
          </button>
        </div>
      </div>
    </div>
  )
}