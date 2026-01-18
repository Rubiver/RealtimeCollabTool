'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'
import DrawingBoard from '@/components/DrawingBoard'
import DocumentEditor from '@/components/DocumentEditor'
import UserList from '@/components/UserList'

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState<'draw' | 'doc'>('draw')
  const [username, setUsername] = useState('')
  const router = useRouter()

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/')
    } else {
      setUsername(storedUsername)
    }
  }, [router])

  if (!username) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-lg px-6 py-4 flex items-center justify-between border-b-2 border-indigo-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            협업 워크스페이스
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
            <span className="text-sm text-indigo-700">
              안녕하세요, <span className="font-semibold">{username}</span>님
            </span>
          </div>
          <button
            onClick={() => router.push('/myworkspace')}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            내 워크스페이스
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('username')
              router.push('/')
            }}
            className="px-4 py-2 bg-white border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Users */}
        <aside className="w-64 bg-white border-r-2 border-indigo-100 flex flex-col shadow-lg">
          <UserList />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white m-2 rounded-lg shadow-lg">
          {/* Tab Navigation */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-100 px-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === 'draw'
                    ? 'text-indigo-700'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  그림 그리기
                </div>
                {activeTab === 'draw' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('doc')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === 'doc'
                    ? 'text-indigo-700'
                    : 'text-gray-600 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  문서 편집
                </div>
                {activeTab === 'doc' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-gray-50 to-indigo-50">
            {activeTab === 'draw' ? <DrawingBoard /> : <DocumentEditor />}
          </div>
        </main>

        {/* Right Sidebar - Chat */}
        <aside className="w-80 bg-white border-l-2 border-indigo-100 shadow-lg">
          <ChatPanel username={username} />
        </aside>
      </div>
    </div>
  )
}