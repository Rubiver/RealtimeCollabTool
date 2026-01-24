'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues
const Workbook = dynamic(
    () => import('@fortune-sheet/react').then((mod) => mod.Workbook),
    { ssr: false }
)

// Import FortuneSheet CSS
import '@fortune-sheet/react/dist/index.css'

interface SpreadsheetEditorProps {
    workspaceId: string
}

export default function SpreadsheetEditor({ workspaceId }: SpreadsheetEditorProps) {
    const [socket, setSocket] = useState<Socket | null>(null)
    const [data, setData] = useState([
        {
            name: 'Sheet1',
            celldata: [],
            row: 50,
            column: 26,
        },
    ])
    const isLocalChange = useRef(false)

    useEffect(() => {
        const username = localStorage.getItem('username')
        if (!username) return

        const socket = io('http://localhost:3001', {
            transports: ['websocket'],
        })

        socket.on('connect', () => {
            socket.emit('joinSpreadsheet', { username, workspaceId })
        })

        // Receive initial data or updates from other users
        socket.on('spreadsheetUpdate', (newData: any) => {
            console.log('📥 Received spreadsheet update:', newData)
            isLocalChange.current = false
            setData(newData)
        })

        // Receive operations from other users
        socket.on('spreadsheetOp', (ops: any[]) => {
            console.log('📥 Received spreadsheet operations:', ops)
            // FortuneSheet will handle the ops automatically
        })

        setSocket(socket)

        return () => {
            socket.close()
        }
    }, [workspaceId])

    const handleOp = (ops: any[]) => {
        if (!socket || !isLocalChange.current) return

        console.log('📤 Sending operations:', ops)
        socket.emit('spreadsheetOp', {
            ops,
            workspaceId,
        })
    }

    const handleChange = (newData: any) => {
        console.log('📝 Spreadsheet changed:', newData)
        isLocalChange.current = true
        setData(newData)

        if (socket) {
            socket.emit('spreadsheetChange', {
                data: newData,
                workspaceId,
            })
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b-2 border-indigo-100 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            공동 스프레드시트
                        </h2>
                        <p className="text-sm text-gray-600">
                            여러 사용자가 동시에 스프레드시트를 편집할 수 있습니다
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <div className="h-full bg-white rounded-lg shadow-2xl border-2 border-green-100 overflow-hidden">
                    <style jsx global>{`
            .fortune-sheet-container {
              width: 100% !important;
              height: 100% !important;
            }
            .luckysheet {
              width: 100% !important;
              height: 100% !important;
            }
            .luckysheet-grid-container {
              background: white !important;
            }
            .luckysheet-toolbar-button:hover {
              background: #10b981 !important;
            }
            .luckysheet-cols-rows-shift-size {
              background: #10b981 !important;
            }
          `}</style>
                    {typeof window !== 'undefined' && (
                        <Workbook
                            data={data}
                            onChange={handleChange}
                            onOp={handleOp}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
