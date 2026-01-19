'use client'

import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  username: string
  message: string
  timestamp: Date
}

interface ChatPanelProps {
  username: string
  workspaceId: string
}

export default function ChatPanel({ username, workspaceId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      timeout: 5000,
    })

    newSocket.on('connect', () => {
      console.log('ChatPanel: Connected to server')
      setIsConnected(true)
      setConnectionError(null)
      newSocket.emit('join', { username, workspaceId })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('ChatPanel: Disconnected from server:', reason)
      setIsConnected(false)
      if (reason === 'io server disconnect') {
        setConnectionError('서버 연결이 끊어졌습니다.')
      }
    })

    newSocket.on('connect_error', (error) => {
      console.error('ChatPanel: Connection error:', error)
      setIsConnected(false)
      setConnectionError('서버에 연결할 수 없습니다. Socket.IO 서버가 실행 중인지 확인하세요.')
    })

    newSocket.io.on('reconnect_attempt', () => {
      console.log('ChatPanel: Attempting to reconnect...')
      setConnectionError('서버 재연결 시도 중...')
    })

    newSocket.io.on('reconnect_failed', () => {
      console.error('ChatPanel: Reconnection failed')
      setConnectionError('서버 재연결에 실패했습니다. 서버를 확인해주세요.')
      setIsConnected(false)
    })

    newSocket.on('message', (data: Message) => {
      setMessages((prev) => [...prev, data])
    })

    newSocket.on('userJoined', (data: { username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          username: 'System',
          message: `${data.username}님이 참여했습니다.`,
          timestamp: new Date(),
        },
      ])
    })

    newSocket.on('userLeft', (data: { username: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          username: 'System',
          message: `${data.username}님이 나갔습니다.`,
          timestamp: new Date(),
        },
      ])
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [username, workspaceId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!inputMessage.trim()) return

    if (socket && isConnected) {
      socket.emit('message', {
        username,
        message: inputMessage.trim(),
        workspaceId,
      })
      setInputMessage('')
    } else {
      const tempMessage: Message = {
        id: Date.now().toString(),
        username,
        message: inputMessage.trim(),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, tempMessage])
      setInputMessage('')
      setConnectionError('서버에 연결되지 않아 로컬에만 표시됩니다.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="font-bold text-lg">채팅</h2>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-300' : 'bg-red-300'
              }`}
            title={isConnected ? '연결됨' : '연결 안됨'}
          />
          <span className="text-xs font-semibold">
            {isConnected ? '연결됨' : '연결 중...'}
          </span>
        </div>
      </div>

      {connectionError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mx-3 mt-3 rounded">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-yellow-700">{connectionError}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-indigo-50/30 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              {isConnected
                ? '메시지가 없습니다. 채팅을 시작해보세요!'
                : '서버 연결을 기다리는 중...'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${msg.username === 'System'
                ? 'text-center'
                : msg.username === username
                  ? 'ml-auto max-w-[80%]'
                  : 'mr-auto max-w-[80%]'
                }`}
            >
              {msg.username === 'System' ? (
                <div className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs italic">
                  {msg.message}
                </div>
              ) : (
                <div className={`${msg.username === username
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white border border-indigo-100 text-gray-800 rounded-2xl rounded-tl-sm'
                  } p-3 shadow-sm`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-semibold text-xs ${msg.username === username ? 'text-indigo-100' : 'text-indigo-700'
                      }`}>
                      {msg.username}
                    </span>
                    <span className={`text-xs ${msg.username === username ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.message}</p>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t-2 border-indigo-100 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? '메시지를 입력하세요...'
                : connectionError
                  ? '서버 연결 실패 (로컬 전용)'
                  : '서버 연결 중...'
            }
            className="flex-1 px-4 py-3 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder:text-gray-400 bg-indigo-50/50"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            className={`px-6 py-3 rounded-lg transition-all font-semibold shadow-md hover:shadow-lg ${isConnected
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
              : 'bg-gray-400 text-white hover:bg-gray-500'
              } disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none`}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}