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
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">협업 도구</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">안녕하세요, {username}님</span>
          <button
            onClick={() => {
              localStorage.removeItem('username')
              router.push('/')
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            로그아웃
          </button>
          <button
            onClick={() => {
              router.push('/myworkspace')
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            내 워크 스페이스로
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Users */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <UserList />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200 px-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('draw')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'draw'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                그림 그리기
              </button>
              <button
                onClick={() => setActiveTab('doc')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'doc'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                문서 편집
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'draw' ? <DrawingBoard /> : <DocumentEditor />}
          </div>
        </main>

        {/* Right Sidebar - Chat */}
        <aside className="w-80 bg-white border-l border-gray-200">
          <ChatPanel username={username} />
        </aside>
      </div>
    </div>
  )
}