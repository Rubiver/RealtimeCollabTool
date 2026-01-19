'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

interface DocumentEditorProps {
  workspaceId: string
}

export default function DocumentEditor({ workspaceId }: DocumentEditorProps) {
  const [content, setContent] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const quillRef = useRef<any>(null)

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (!username) return

    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      socket.emit('joinDocument', { username, workspaceId })
    })

    socket.on('documentUpdate', (data: { content: string }) => {
      setContent(data.content)
    })

    setSocket(socket)

    return () => {
      socket.close()
    }
  }, [workspaceId])

  const handleChange = (value: string) => {
    setContent(value)
    if (socket) {
      socket.emit('documentChange', {
        data: { content: value },
        workspaceId
      })
    }
  }

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['link', 'image'],
      ['clean'],
    ],
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b-2 border-indigo-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              공동 문서 편집
            </h2>
            <p className="text-sm text-gray-600">
              여러 사용자가 동시에 문서를 편집할 수 있습니다
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl border-2 border-indigo-100 overflow-hidden">
          <style jsx global>{`
            .ql-toolbar {
              background: linear-gradient(to right, #eef2ff, #faf5ff) !important;
              border: none !important;
              border-bottom: 2px solid #e0e7ff !important;
            }
            .ql-container {
              border: none !important;
              font-size: 16px !important;
            }
            .ql-editor {
              min-height: 500px !important;
              padding: 2rem !important;
            }
            .ql-toolbar button:hover,
            .ql-toolbar button:focus,
            .ql-toolbar .ql-picker-label:hover,
            .ql-toolbar .ql-picker-label.ql-active {
              color: #6366f1 !important;
            }
            .ql-toolbar button.ql-active,
            .ql-toolbar .ql-picker-item.ql-selected {
              color: #6366f1 !important;
            }
            .ql-stroke {
              stroke: #4b5563 !important;
            }
            .ql-stroke:hover,
            .ql-active .ql-stroke {
              stroke: #6366f1 !important;
            }
            .ql-fill {
              fill: #4b5563 !important;
            }
            .ql-fill:hover,
            .ql-active .ql-fill {
              fill: #6366f1 !important;
            }
          `}</style>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content}
            onChange={handleChange}
            modules={modules}
            className="h-full"
            placeholder="여기에 내용을 입력하세요..."
          />
        </div>
      </div>
    </div>
  )
}