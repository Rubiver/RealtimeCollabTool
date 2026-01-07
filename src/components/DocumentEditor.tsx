'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false })
import 'react-quill/dist/quill.snow.css'

export default function DocumentEditor() {
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
      socket.emit('joinDocument', { username })
    })

    // Receive document updates from other users
    socket.on('documentUpdate', (data: { content: string }) => {
      setContent(data.content)
    })

    setSocket(socket)

    return () => {
      socket.close()
    }
  }, [])

  const handleChange = (value: string) => {
    setContent(value)
    if (socket) {
      socket.emit('documentChange', { content: value })
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
    <div className="h-full flex flex-col bg-white">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-800">공동 문서 편집</h2>
        <p className="text-sm text-gray-600 mt-1">
          여러 사용자가 동시에 문서를 편집할 수 있습니다
        </p>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleChange}
          modules={modules}
          className="h-full"
          style={{ height: 'calc(100% - 100px)' }}
        />
      </div>
    </div>
  )
}
