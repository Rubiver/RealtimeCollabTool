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
}

export default function ChatPanel({ username }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'], // polling도 시도
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3, // 재연결 시도 횟수 제한
      timeout: 5000, // 연결 타임아웃
    })

    newSocket.on('connect', () => {
      console.log('ChatPanel: Connected to server')
      setIsConnected(true)
      setConnectionError(null)
      newSocket.emit('join', { username })
    })

    newSocket.on('disconnect', (reason) => {
      console.log('ChatPanel: Disconnected from server:', reason)
      setIsConnected(false)
      if (reason === 'io server disconnect') {
        // 서버가 연결을 끊은 경우
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
  }, [username])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!inputMessage.trim()) return
    
    if (socket && isConnected) {
      socket.emit('message', {
        username,
        message: inputMessage.trim(),
      })
      setInputMessage('')
    } else {
      // 서버 연결 없이도 로컬 메시지로 표시 (임시)
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
      <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold text-lg">채팅</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-300' : 'bg-red-300'
            }`}
            title={isConnected ? '연결됨' : '연결 안됨'}
          />
          <span className="text-xs">
            {isConnected ? '연결됨' : '연결 중...'}
          </span>
        </div>
      </div>
      {connectionError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mx-4 mt-2">
          <p className="text-xs text-yellow-700">{connectionError}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            {isConnected 
              ? '메시지가 없습니다. 채팅을 시작해보세요!'
              : '서버 연결을 기다리는 중...'}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold text-sm ${
                    msg.username === 'System'
                      ? 'text-gray-500 italic'
                      : 'text-gray-800'
                  }`}
                >
                  {msg.username}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-gray-700 text-sm">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-gray-200 p-4">
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
            disabled={false}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim()}
            className={`px-6 py-2 rounded-lg transition-colors ${
              isConnected
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-400 text-white hover:bg-gray-500'
            } disabled:bg-gray-300 disabled:cursor-not-allowed`}
          >
            전송
          </button>
        </div>
      </div>
    </div>
  )
}
