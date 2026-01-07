'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface User {
  id: string
  username: string
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (!username) return

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3, // 재연결 시도 횟수 제한
      timeout: 5000, // 연결 타임아웃
    })

    newSocket.on('connect', () => {
      console.log('UserList: Connected to server')
      // join 이벤트는 ChatPanel에서만 보내도록 변경
      // 여기서는 사용자 목록만 요청
      newSocket.emit('getUsers')
    })

    newSocket.on('connect_error', (error) => {
      console.error('UserList: Connection error:', error)
    })

    newSocket.on('users', (userList: User[]) => {
      console.log('UserList: Received users:', userList)
      // 중복 제거 (같은 username이 여러 개 있는 경우)
      const uniqueUsers = Array.from(
        new Map(userList.map(user => [user.username, user])).values()
      )
      setUsers(uniqueUsers)
    })

    newSocket.on('userJoined', () => {
      // 사용자 추가 시 목록 갱신
      newSocket.emit('getUsers')
    })

    newSocket.on('userLeft', () => {
      // 사용자 나감 시 목록 갱신
      newSocket.emit('getUsers')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      <div className="bg-primary-600 text-white px-4 py-3">
        <h2 className="font-semibold text-lg">참여자 ({users.length})</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {users.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            참여자가 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-800 font-medium">
                  {user.username}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
