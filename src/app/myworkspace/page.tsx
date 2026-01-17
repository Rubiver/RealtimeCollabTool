'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Workspace {
  id: string
  name: string
  invite_code: string
  owner_id : string
  create_at : Date
}

export default function WorkspacePage() {  
  const [activeTab, setActiveTab] = useState<'draw' | 'doc'>('draw')
  const [username, setUsername] = useState('')
  const [workspace, setWorkspace] = useState<Workspace[]>([]);
  const router = useRouter()

  useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (!storedUsername) {
      router.push('/')
    } else {
      setUsername(storedUsername);

      const loadData = async () => {
          const response = await fetch('/api/workspace/get', {
          method: 'POST',
          body: JSON.stringify(storedUsername),
          headers: { 'Content-Type': 'application/json' },
        });
        
        const workspace_data = await response.json();

        setWorkspace(workspace_data);
      };
      loadData();
    }
  }, [router])

  if (!username) {
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
        {workspace.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            생성된 워크 스페이스가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {workspace?.map((space) => (
              <div
                key={space.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {space.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-800 font-medium">
                  {space.owner_id}
                </span>
              </div>
            ))} 
          </div>
        )}
      </div>
  )
}
