'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Workspace {
  id: string
  name: string
  invite_code: string
  owner_id: string
  create_at: Date
}

export default function WorkspacePage() {  
  const [username, setUsername] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/')
    } else {
      setUsername(storedUsername)
      loadWorkspaces(storedUsername)
    }
  }, [router])

  const loadWorkspaces = async (username: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/workspace/get', {
        method: 'POST',
        body: JSON.stringify({ storedUsername: username }),
        headers: { 'Content-Type': 'application/json' },
      })
      
      const data = await response.json()
      
      if (data.rows) {
        setWorkspaces(data.rows)
      }
    } catch (error) {
      console.error('워크스페이스 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWorkspace = () => {
    router.push('/createworkspace')
  }

  const handleJoinWorkspace = async () => {
    if (!inviteCode.trim()) {
      alert('초대 코드를 입력해주세요.')
      return
    }

    try {
      setIsJoining(true)
      
      const response = await fetch('/api/workspace/join', {
        method: 'POST',
        body: JSON.stringify({ 
          invite_code: inviteCode.trim(),
          user_id: username 
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(result.message)
        setShowJoinModal(false)
        setInviteCode('')
        // 워크스페이스 목록 새로고침
        loadWorkspaces(username)
      } else {
        alert(result.message || '워크스페이스 입장에 실패했습니다.')
      }
    } catch (error) {
      console.error('워크스페이스 입장 오류:', error)
      alert('서버 오류가 발생했습니다.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleWorkspaceClick = (workspaceId: string) => {
    console.log('워크스페이스 선택:', workspaceId)
    router.push(`/workspace?id=${workspaceId}`)
  }

  const closeModal = () => {
    setShowJoinModal(false)
    setInviteCode('')
  }

  if (!username) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">내 워크스페이스</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">안녕하세요, {username}님</span>
          <button
            onClick={() => router.push('/workspace')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            기본 워크스페이스
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('username')
              router.push('/')
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* 헤더 섹션 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">워크스페이스 목록</h2>
              <p className="text-sm text-gray-600 mt-1">
                참여 중인 워크스페이스를 확인하고 관리하세요
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                워크스페이스 입장
              </button>
              <button
                onClick={handleCreateWorkspace}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                워크스페이스 생성
              </button>
            </div>
          </div>

          {/* 워크스페이스 리스트 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-16">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                참여 중인 워크스페이스가 없습니다
              </h3>
              <p className="text-gray-500 mb-6">
                새로운 워크스페이스를 생성하거나 초대 코드로 입장하세요
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  워크스페이스 입장
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                >
                  첫 워크스페이스 만들기
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          {workspace.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          소유자: {workspace.owner_id}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {workspace.invite_code || '초대 코드 없음'}
                      </span>
                    </div>
                    
                    {workspace.create_at && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">
                          {new Date(workspace.create_at).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
                워크스페이스 입장
              </h2>
              <p className="text-center text-gray-600 text-sm">
                초대 코드를 입력하여 워크스페이스에 참여하세요
              </p>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  초대 코드 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="예: ABC12345"
                  maxLength={8}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-gray-900 placeholder:text-gray-400 font-mono text-lg text-center tracking-wider"
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinWorkspace()}
                />
                <p className="mt-1 text-xs text-gray-500">
                  워크스페이스 소유자로부터 받은 8자리 코드를 입력하세요
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                <div className="flex">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-purple-700">
                    <p className="font-semibold mb-1">참고 사항</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>초대 코드는 대소문자를 구분하지 않습니다</li>
                      <li>유효하지 않은 코드는 입장할 수 없습니다</li>
                      <li>이미 참여 중인 워크스페이스는 중복 입장할 수 없습니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                >
                  취소
                </button>
                <button
                  onClick={handleJoinWorkspace}
                  disabled={!inviteCode.trim() || isJoining}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
                >
                  {isJoining ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      입장 중...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      입장하기
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}