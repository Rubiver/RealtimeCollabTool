'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createId } from '@paralleldrive/cuid2'

export default function CreateWorkspacePage() {
  const [username, setUsername] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/')
    } else {
      setUsername(storedUsername)
    }
  }, [router])

  // 초대 코드 생성 함수
  const generateInviteCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }
    setInviteCode(code)
  }

  // 워크스페이스 이름이 입력되면 자동으로 초대 코드 생성
  useEffect(() => {
    if (workspaceName.trim()) {
      generateInviteCode()
    } else {
      setInviteCode('')
    }
  }, [workspaceName])

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      alert('워크스페이스 이름을 입력해주세요.')
      return
    }

    if (!inviteCode) {
      alert('초대 코드가 생성되지 않았습니다.')
      return
    }

    try {
      setIsCreating(true)
      
      const workspaceData = {
        id: createId(),
        name: workspaceName.trim(),
        invite_code: inviteCode,
        owner_id: username,
        create_at: new Date().toISOString()
      }

      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        body: JSON.stringify(workspaceData),
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (result.isAccede) {
        alert('워크스페이스가 성공적으로 생성되었습니다!')
        router.push('/myworkspace')
      } else {
        alert('워크스페이스 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('워크스페이스 생성 오류:', error)
      alert('서버 오류가 발생했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode)
      alert('초대 코드가 클립보드에 복사되었습니다!')
    }
  }

  if (!username) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">워크스페이스 생성</h1>
        <button
          onClick={() => router.push('/myworkspace')}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          돌아가기
        </button>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              새 워크스페이스 만들기
            </h2>
            <p className="text-gray-600">
              팀원들과 협업할 워크스페이스를 생성하세요
            </p>
          </div>

          <div className="space-y-6">
            {/* 워크스페이스 이름 입력 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                워크스페이스 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="예: 마케팅팀, 개발팀, 프로젝트 A"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                maxLength={50}
              />
              <p className="mt-1 text-xs text-gray-500">
                최대 50자까지 입력 가능합니다
              </p>
            </div>

            {/* 초대 코드 표시 */}
            {inviteCode && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="block text-sm font-semibold text-indigo-900 mb-1">
                      생성된 초대 코드
                    </label>
                    <p className="text-xs text-indigo-600">
                      이 코드로 팀원을 초대할 수 있습니다
                    </p>
                  </div>
                  <button
                    onClick={generateInviteCode}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    재생성
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white border-2 border-indigo-300 rounded-lg px-4 py-3">
                    <code className="text-2xl font-bold text-indigo-700 tracking-wider">
                      {inviteCode}
                    </code>
                  </div>
                  <button
                    onClick={copyInviteCode}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    title="복사"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    복사
                  </button>
                </div>
              </div>
            )}

            {/* 소유자 정보 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                워크스페이스 소유자
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-900 font-medium">{username}</span>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">워크스페이스 생성 안내</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>워크스페이스 이름을 입력하면 초대 코드가 자동으로 생성됩니다</li>
                    <li>생성된 초대 코드를 팀원들과 공유하여 협업을 시작하세요</li>
                    <li>워크스페이스는 언제든지 관리할 수 있습니다</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 생성 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => router.push('/myworkspace')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!workspaceName.trim() || !inviteCode || isCreating}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    워크스페이스 생성
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}