'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [username, setUsername] = useState('')
  const router = useRouter()

  const handleJoin = () => {
    if (username.trim()) {
      localStorage.setItem('username', username.trim())
      router.push('/workspace')
    }
  }

  const handleSignIn = () => {
    router.push('/signin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          협업 도구에 오신 것을 환영합니다
        </h1>
        <p className="text-center text-gray-600 mb-8">
          실시간으로 그림을 그리고 문서를 편집하세요
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              사용자 이름
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
            />
          </div>          
          <button
            onClick={handleJoin}
            disabled={!username.trim()}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            시작하기
          </button>

          <button
            onClick={handleSignIn}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}
