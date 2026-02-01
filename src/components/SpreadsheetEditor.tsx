'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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

interface CursorInfo {
    socketId: string
    username: string
    row: number
    column: number
    sheetIndex: number
    color: string
    timestamp: number
}

// 사용자별 고유 색상 생성
const generateUserColor = (username: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F1948A', '#82E0AA', '#F8C471', '#D7BDE2', '#A3E4D7'
    ]
    let hash = 0
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

// 커서 오버레이 컴포넌트
function CursorOverlay({ cursors, containerRef }: { cursors: Map<string, CursorInfo>, containerRef: React.RefObject<HTMLDivElement | null> }) {
    const [cursorPositions, setCursorPositions] = useState<Map<string, { left: number, top: number, width: number, height: number }>>(new Map())

    useEffect(() => {
        const updatePositions = () => {
            if (!containerRef.current) return

            const container = containerRef.current
            const gridContainer = container.querySelector('.luckysheet-cell-main')
            if (!gridContainer) return

            const newPositions = new Map<string, { left: number, top: number, width: number, height: number }>()

            cursors.forEach((cursor, socketId) => {
                // FortuneSheet 셀 위치 계산
                const rowHeader = container.querySelector(`.luckysheet-rows-h .luckysheet-rows-h-cells div[data-r="${cursor.row}"]`) as HTMLElement
                const colHeader = container.querySelector(`.luckysheet-cols-h-cells div[data-c="${cursor.column}"]`) as HTMLElement

                if (rowHeader && colHeader) {
                    const containerRect = container.getBoundingClientRect()
                    const rowRect = rowHeader.getBoundingClientRect()
                    const colRect = colHeader.getBoundingClientRect()

                    newPositions.set(socketId, {
                        left: colRect.left - containerRect.left,
                        top: rowRect.top - containerRect.top,
                        width: colRect.width,
                        height: rowRect.height
                    })
                } else {
                    // 기본 셀 크기로 계산 (대략적인 위치)
                    const defaultColWidth = 73
                    const defaultRowHeight = 20
                    const headerOffset = 46 // 툴바 + 헤더 높이
                    const rowHeaderOffset = 46 // 행 헤더 너비

                    newPositions.set(socketId, {
                        left: rowHeaderOffset + (cursor.column * defaultColWidth),
                        top: headerOffset + (cursor.row * defaultRowHeight),
                        width: defaultColWidth,
                        height: defaultRowHeight
                    })
                }
            })

            setCursorPositions(newPositions)
        }

        updatePositions()
        const interval = setInterval(updatePositions, 500)

        return () => clearInterval(interval)
    }, [cursors, containerRef])

    return (
        <>
            {Array.from(cursors.entries()).map(([socketId, cursor]) => {
                const position = cursorPositions.get(socketId)
                if (!position) return null

                return (
                    <div
                        key={socketId}
                        className="remote-cursor-indicator"
                        style={{
                            left: position.left,
                            top: position.top,
                            width: position.width,
                            height: position.height,
                            borderColor: cursor.color,
                            backgroundColor: `${cursor.color}20`,
                        }}
                    >
                        <div
                            className="remote-cursor-label"
                            style={{ backgroundColor: cursor.color }}
                        >
                            {cursor.username}
                        </div>
                    </div>
                )
            })}
        </>
    )
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
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorInfo>>(new Map())
    const [currentUsername, setCurrentUsername] = useState<string>('')
    const [userColor, setUserColor] = useState<string>('')
    const workbookRef = useRef<any>(null)
    const applyingRemoteOp = useRef(false)
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // 워크스페이스 입장 시 데이터 불러오기
    useEffect(() => {
        loadSpreadsheetData()
    }, [workspaceId])

    // Socket.IO 연결
    useEffect(() => {
        const username = localStorage.getItem('username')
        if (!username) return

        setCurrentUsername(username)
        const color = generateUserColor(username)
        setUserColor(color)

        const socket = io('http://localhost:3001', {
            transports: ['websocket'],
        })

        socket.on('connect', () => {
            socket.emit('joinSpreadsheet', { username, workspaceId, storage: data })
        })

        // Receive initial data or updates from other users
        socket.on('spreadsheetUpdate', (newData: any) => {
            console.log('📥 Received spreadsheet update:', newData)
            setData(newData)
        })

        // Receive operations from other users
        socket.on('spreadsheetOp', (ops: any[]) => {
            if (workbookRef.current) {
                applyingRemoteOp.current = true
                workbookRef.current.applyOp(ops)
                applyingRemoteOp.current = false
            }
            console.log('📥 Received spreadsheet operations:', ops)
        })

        // Receive existing cursors when joining
        socket.on('spreadsheetCursors', (cursors: CursorInfo[]) => {
            console.log('📍 Received existing cursors:', cursors)
            const cursorMap = new Map<string, CursorInfo>()
            cursors.forEach(cursor => {
                if (cursor.username !== username) {
                    cursorMap.set(cursor.socketId, cursor)
                }
            })
            setRemoteCursors(cursorMap)
        })

        // Receive cursor updates from other users
        socket.on('cursorUpdate', (cursor: CursorInfo) => {
            console.log('📍 Cursor update:', cursor)
            if (cursor.username !== username) {
                setRemoteCursors(prev => {
                    const newMap = new Map(prev)
                    newMap.set(cursor.socketId, cursor)
                    return newMap
                })
            }
        })

        // Remove cursor when user leaves
        socket.on('cursorRemove', ({ socketId }: { socketId: string }) => {
            console.log('📍 Cursor removed:', socketId)
            setRemoteCursors(prev => {
                const newMap = new Map(prev)
                newMap.delete(socketId)
                return newMap
            })
        })

        setSocket(socket)

        return () => {
            socket.emit('cellDeselect', { workspaceId })
            socket.close()
        }
    }, [workspaceId])

    // 자동 저장 타이머 정리
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [])

    // 스프레드시트 데이터 불러오기
    const loadSpreadsheetData = async () => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/workspace/spreadsheet/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId }),
            })

            const result = await response.json()

            if (result.data) {
                setData(result.data)
                if (result.exists && result.updatedAt) {
                    setLastSaved(new Date(result.updatedAt))
                }
            }
        } catch (error) {
            console.error('스프레드시트 불러오기 실패:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // 스프레드시트 데이터 저장
    const saveSpreadsheetData = async (dataToSave: any) => {
        try {
            setIsSaving(true)
            const response = await fetch('/api/workspace/spreadsheet/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    data: dataToSave,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setLastSaved(new Date())
                console.log('✅ 스프레드시트 저장 완료')
            } else {
                console.error('❌ 스프레드시트 저장 실패:', result.message)
            }
        } catch (error) {
            console.error('스프레드시트 저장 오류:', error)
        } finally {
            setIsSaving(false)
        }
    }

    // 수동 저장 버튼
    const handleManualSave = () => {
        saveSpreadsheetData(data)
    }

    const handleOp = (ops: any[]) => {
        if (!socket || applyingRemoteOp.current) {
            return
        }
        console.log('📤 Sending operations:', ops)
        socket.emit('spreadsheetOp', {
            ops,
            workspaceId,
        })
    }

    // 셀 선택 핸들러
    const handleCellSelect = useCallback((cell: { row: number; column: number }, sheetIndex: number) => {
        if (!socket || !currentUsername) return

        socket.emit('cellSelect', {
            username: currentUsername,
            workspaceId,
            row: cell.row,
            column: cell.column,
            sheetIndex,
            color: userColor,
        })
        console.log(`📍 Selected cell [${cell.row}, ${cell.column}]`)
    }, [socket, currentUsername, workspaceId, userColor])

    const handleChange = (newData: any) => {
        console.log('📝 Spreadsheet changed:', newData)
        setData(newData)

        // 실시간 동기화를 위해 소켓으로 전송
        if (socket) {
            socket.emit('spreadsheetChange', {
                data: newData,
                workspaceId,
            })
        }

        // 자동 저장 타이머 설정 (5초 후 저장)
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }
        autoSaveTimerRef.current = setTimeout(() => {
            saveSpreadsheetData(newData)
        }, 5000)
    }

    const formatLastSaved = () => {
        if (!lastSaved) return '저장 안됨'
        const now = new Date()
        const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000)

        if (diff < 60) return `${diff}초 전 저장됨`
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전 저장됨`
        return lastSaved.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    if (isLoading) {
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
                            <p className="text-sm text-gray-600">데이터를 불러오는 중...</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-3"></div>
                        <p className="text-sm text-gray-600">스프레드시트를 불러오는 중입니다...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white border-b-2 border-indigo-100 px-6 py-4">
                <div className="flex items-center justify-between">
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

                    <div className="flex items-center gap-4">
                        {/* 현재 접속자 표시 */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">접속 중:</span>
                            <div className="flex items-center -space-x-2">
                                {/* 본인 표시 */}
                                {currentUsername && (
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md"
                                        style={{ backgroundColor: userColor }}
                                        title={`${currentUsername} (나)`}
                                    >
                                        {currentUsername.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {/* 다른 사용자들 표시 */}
                                {Array.from(remoteCursors.values()).map((cursor) => (
                                    <div
                                        key={cursor.socketId}
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md"
                                        style={{ backgroundColor: cursor.color }}
                                        title={cursor.username}
                                    >
                                        {cursor.username.charAt(0).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs text-gray-400">
                                ({1 + remoteCursors.size}명)
                            </span>
                        </div>

                        {/* 저장 상태 표시 */}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                    <span>저장 중...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{formatLastSaved()}</span>
                                </>
                            )}
                        </div>

                        {/* 수동 저장 버튼 */}
                        <button
                            onClick={handleManualSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-semibold flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <div ref={containerRef} className="h-full bg-white rounded-lg shadow-2xl border-2 border-green-100 overflow-hidden relative">
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
                        .remote-cursor-indicator {
                            position: absolute;
                            pointer-events: none;
                            z-index: 1000;
                            border: 2px solid;
                            animation: pulse 2s infinite;
                        }
                        .remote-cursor-label {
                            position: absolute;
                            top: -24px;
                            left: 0;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 600;
                            color: white;
                            white-space: nowrap;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.7; }
                        }
                    `}</style>
                    {typeof window !== 'undefined' && (
                        <Workbook
                            ref={workbookRef}
                            data={data}
                            onChange={handleChange}
                            onOp={handleOp}
                            hooks={{
                                afterSelectionChange: (_sheetId: string, selection: { row: number[], column: number[] }) => {
                                    if (selection && selection.row && selection.column) {
                                        handleCellSelect({
                                            row: selection.row[0],
                                            column: selection.column[0]
                                        }, 0)
                                    }
                                }
                            }}
                        />
                    )}

                    {/* 다른 사용자 커서 표시 */}
                    <CursorOverlay cursors={remoteCursors} containerRef={containerRef} />
                </div>
            </div>

            {/* 자동 저장 안내 */}
            <div className="bg-green-50 border-t-2 border-green-100 px-6 py-3">
                <div className="flex items-center gap-2 text-sm text-green-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                        <strong>자동 저장:</strong> 변경 사항은 5초 후 자동으로 저장됩니다. "저장" 버튼을 눌러 즉시 저장할 수도 있습니다.
                    </span>
                </div>
            </div>
        </div>
    )
}