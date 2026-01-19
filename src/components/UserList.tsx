'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'

interface User {
  id: string
  username: string
}

interface UserListProps {
  workspaceId: string
}

export default function UserList({ workspaceId }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const username = localStorage.getItem('username')
    if (!username) return

    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      timeout: 5000,
    })

    newSocket.on('connect', () => {
      console.log('UserList: Connected to server')
      newSocket.emit('getUsers', { workspaceId })
    })

    newSocket.on('connect_error', (error) => {
      console.error('UserList: Connection error:', error)
    })

    newSocket.on('users', (userList: User[]) => {
      console.log('UserList: Received users:', userList)
      const uniqueUsers = Array.from(
        new Map(userList.map(user => [user.username, user])).values()
      )
      setUsers(uniqueUsers)
    })

    newSocket.on('userJoined', () => {
      newSocket.emit('getUsers', { workspaceId })
    })

    newSocket.on('userLeft', () => {
      newSocket.emit('getUsers', { workspaceId })
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [workspaceId])

  return (
    <div className="h-full flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">참여자</h2>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            <span className="text-sm font-semibold">{users.length}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-indigo-50/30 to-white">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">참여자가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-white border border-indigo-100 rounded-lg hover:shadow-md hover:border-indigo-300 transition-all group"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-110 transition-transform">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="text-gray-800 font-semibold block">
                    {user.username}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500">온라인</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}