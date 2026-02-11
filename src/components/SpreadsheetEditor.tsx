'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import '@univerjs/preset-sheets-core/lib/index.css'

interface SpreadsheetEditorProps {
    workspaceId: string
}

interface CursorInfo {
    socketId: string
    username: string
    row: number
    column: number
    color: string
}

// 사용자별 고유 색상 생성
const generateUserColor = (username: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F1948A', '#82E0AA', '#F8C471', '#D7BDE2', '#A3E4D7'
    ]
    let hash = 0
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
}

export default function SpreadsheetEditor({ workspaceId }: SpreadsheetEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const univerRef = useRef<any>(null)
    const socketRef = useRef<Socket | null>(null)
    const applyingRemote = useRef(false)
    const disposablesRef = useRef<any[]>([])
    const lastSelectedCell = useRef<{ row: number; column: number } | null>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)
    const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorInfo>>(new Map())
    const [currentUsername, setCurrentUsername] = useState('')
    const [userColor, setUserColor] = useState('')

    // Univer 초기화 + Socket.IO 연결
    useEffect(() => {
        const username = localStorage.getItem('username')
        if (!username || !containerRef.current) return

        setCurrentUsername(username)
        const color = generateUserColor(username)
        setUserColor(color)

        let disposed = false

        const init = async () => {
            // Univer 모듈 동적 import (SSR 방지)
            const { createUniver, LocaleType, mergeLocales } = await import('@univerjs/presets')
            const { UniverSheetsCorePreset } = await import('@univerjs/preset-sheets-core')
            const UniverPresetSheetsCoreKoKR = (await import('@univerjs/preset-sheets-core/locales/ko-KR')).default

            if (disposed) return

            // 기존 스프레드시트 데이터 불러오기
            let initialData: any = null
            try {
                const response = await fetch('/api/workspace/spreadsheet/load', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workspaceId }),
                })
                const result = await response.json()
                if (result.data) {
                    initialData = result.data
                    if (result.exists && result.updatedAt) {
                        setLastSaved(new Date(result.updatedAt))
                    }
                }
            } catch (error) {
                console.error('스프레드시트 불러오기 실패:', error)
            }

            if (disposed) return

            // Univer 인스턴스 생성
            const { univerAPI } = createUniver({
                locale: LocaleType.KO_KR,
                locales: {
                    [LocaleType.KO_KR]: mergeLocales(UniverPresetSheetsCoreKoKR),
                },
                presets: [
                    UniverSheetsCorePreset({
                        container: containerRef.current!,
                    }),
                ],
            })

            if (disposed) {
                univerAPI.dispose()
                return
            }

            univerRef.current = univerAPI

            // 워크북 생성 (저장된 데이터 또는 빈 워크북)
            if (initialData && initialData.id) {
                univerAPI.createWorkbook(initialData)
            } else {
                univerAPI.createWorkbook({})
            }

            setIsLoading(false)

            // Socket.IO 연결
            const socket = io('http://localhost:3001', {
                transports: ['websocket'],
            })
            socketRef.current = socket

            socket.on('connect', () => {
                // 현재 워크북 스냅샷을 서버에 전송
                const workbook = univerAPI.getActiveWorkbook()
                const snapshot = workbook ? workbook.save() : null
                socket.emit('joinSpreadsheet', {
                    username,
                    workspaceId,
                    snapshot,
                })
            })

            // 다른 사용자의 셀 변경 수신
            socket.on('cellChanged', (change: { row: number; column: number; value: any; username: string }) => {
                if (change.username === username) return

                applyingRemote.current = true
                try {
                    const workbook = univerAPI.getActiveWorkbook()
                    if (workbook) {
                        const sheet = workbook.getActiveSheet()
                        if (sheet) {
                            const range = sheet.getRange(change.row, change.column)
                            if (change.value !== null && change.value !== undefined) {
                                range.setValue(change.value)
                            }
                        }
                    }
                } catch (e) {
                    console.error('원격 셀 변경 적용 실패:', e)
                }
                // 짧은 딜레이 후 applyingRemote를 false로 설정
                setTimeout(() => {
                    applyingRemote.current = false
                }, 50)
            })

            // 전체 스냅샷 수신 (새 사용자 입장 시)
            socket.on('spreadsheetSnapshot', (snapshot: any) => {
                if (!snapshot) return
                console.log('📥 전체 스냅샷 수신')

                applyingRemote.current = true
                try {
                    const workbook = univerAPI.getActiveWorkbook()
                    if (workbook && snapshot.sheets) {
                        const sheet = workbook.getActiveSheet()
                        if (sheet) {
                            const sheetData = Object.values(snapshot.sheets)[0] as any
                            if (sheetData?.cellData) {
                                for (const [rowStr, cols] of Object.entries(sheetData.cellData)) {
                                    for (const [colStr, cell] of Object.entries(cols as any)) {
                                        const cellData = cell as any
                                        if (cellData && cellData.v !== undefined) {
                                            sheet.getRange(Number(rowStr), Number(colStr)).setValue(cellData.v)
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('스냅샷 적용 실패:', e)
                }
                setTimeout(() => {
                    applyingRemote.current = false
                }, 100)
            })

            // 커서 관련 소켓 이벤트
            socket.on('spreadsheetCursors', (cursors: CursorInfo[]) => {
                const cursorMap = new Map<string, CursorInfo>()
                cursors.forEach(cursor => {
                    if (cursor.username !== username) {
                        cursorMap.set(cursor.socketId, cursor)
                    }
                })
                setRemoteCursors(cursorMap)
            })

            socket.on('cursorUpdate', (cursor: CursorInfo) => {
                if (cursor.username !== username) {
                    setRemoteCursors(prev => {
                        const newMap = new Map(prev)
                        newMap.set(cursor.socketId, cursor)
                        return newMap
                    })
                }
            })

            socket.on('cursorRemove', ({ socketId }: { socketId: string }) => {
                setRemoteCursors(prev => {
                    const newMap = new Map(prev)
                    newMap.delete(socketId)
                    return newMap
                })
            })

            // 셀 값 변경 이벤트 리스닝
            const valueDisposable = univerAPI.addEvent(
                univerAPI.Event.SheetValueChanged,
                (params: any) => {
                    if (applyingRemote.current || !socketRef.current) return

                    // 변경된 셀 정보 추출
                    const workbook = univerAPI.getActiveWorkbook()
                    if (!workbook) return

                    const sheet = workbook.getActiveSheet()
                    if (!sheet) return

                    // 현재 선택된 셀의 값을 가져와서 전송
                    const selection = sheet.getSelection()
                    if (selection) {
                        const activeRange = selection.getActiveRange()
                        if (activeRange) {
                            const row = activeRange.getRow()
                            const col = activeRange.getColumn()
                            const values = activeRange.getValues()
                            const value = values?.[0]?.[0] ?? null

                            socketRef.current.emit('cellChange', {
                                workspaceId,
                                username,
                                row,
                                column: col,
                                value,
                            })
                            console.log(`📤 셀 변경 전송: [${row}, ${col}] = ${value}`)
                        }
                    }
                }
            )
            disposablesRef.current.push(valueDisposable)

            // 셀 선택 변경 이벤트 리스닝
            const selectionDisposable = univerAPI.addEvent(
                univerAPI.Event.SelectionChanged,
                (params: any) => {
                    if (!socketRef.current) return

                    const selections = params?.selections
                    if (!selections || selections.length === 0) return

                    const sel = selections[0]
                    const row = sel.range?.startRow ?? sel.startRow
                    const col = sel.range?.startColumn ?? sel.startColumn

                    if (typeof row !== 'number' || typeof col !== 'number') return

                    // 같은 셀이면 무시
                    if (lastSelectedCell.current &&
                        lastSelectedCell.current.row === row &&
                        lastSelectedCell.current.column === col) {
                        return
                    }
                    lastSelectedCell.current = { row, column: col }

                    socketRef.current.emit('cellSelect', {
                        username,
                        workspaceId,
                        row,
                        column: col,
                        color,
                    })
                }
            )
            disposablesRef.current.push(selectionDisposable)
        }

        init()

        return () => {
            disposed = true
            disposablesRef.current.forEach(d => d?.dispose?.())
            disposablesRef.current = []
            if (socketRef.current) {
                socketRef.current.emit('cellDeselect', { workspaceId })
                socketRef.current.close()
                socketRef.current = null
            }
            if (univerRef.current) {
                univerRef.current.dispose()
                univerRef.current = null
            }
        }
    }, [workspaceId])

    // 수동 저장
    const handleManualSave = async () => {
        if (!univerRef.current) return

        const workbook = univerRef.current.getActiveWorkbook()
        if (!workbook) return

        const snapshot = workbook.save()

        try {
            setIsSaving(true)
            const response = await fetch('/api/workspace/spreadsheet/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    data: snapshot,
                }),
            })
            const result = await response.json()
            if (result.success) {
                setLastSaved(new Date())
                console.log('✅ 스프레드시트 저장 완료')
            }
        } catch (error) {
            console.error('스프레드시트 저장 오류:', error)
        } finally {
            setIsSaving(false)
        }
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

    return (
        <div className="h-full flex flex-col">
            {/* 헤더 */}
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
                                {currentUsername && (
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md z-10"
                                        style={{ backgroundColor: userColor }}
                                        title={`${currentUsername} (나)`}
                                    >
                                        {currentUsername.charAt(0).toUpperCase()}
                                    </div>
                                )}
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

                        {/* 저장 상태 */}
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

                        {/* 저장 버튼 */}
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

            {/* 스프레드시트 영역 */}
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 p-4 relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-3"></div>
                            <p className="text-sm text-gray-600">스프레드시트를 불러오는 중입니다...</p>
                        </div>
                    </div>
                )}

                <div className="h-full bg-white rounded-lg shadow-2xl border-2 border-green-100 overflow-hidden relative">
                    {/* Univer가 렌더링될 컨테이너 */}
                    <div ref={containerRef} className="w-full h-full" />

                    {/* 다른 사용자 커서 표시 */}
                    {Array.from(remoteCursors.values()).map((cursor) => (
                        <CursorBadge key={cursor.socketId} cursor={cursor} containerRef={containerRef} />
                    ))}
                </div>
            </div>
        </div>
    )
}

// 커서 배지 컴포넌트 (각 사용자별)
function CursorBadge({ cursor, containerRef }: { cursor: CursorInfo; containerRef: React.RefObject<HTMLDivElement | null> }) {
    const [pos, setPos] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

    useEffect(() => {
        const update = () => {
            if (!containerRef.current) return

            const container = containerRef.current

            // Univer의 셀 요소 찾기
            const cellElements = container.querySelectorAll('[class*="univer-sheet-cell"]')
            // 기본 위치 계산 (대략적)
            const defaultColWidth = 88
            const defaultRowHeight = 24
            const headerHeight = 80 // 툴바 + 수식바 + 열 헤더
            const rowHeaderWidth = 46

            setPos({
                left: rowHeaderWidth + (cursor.column * defaultColWidth),
                top: headerHeight + (cursor.row * defaultRowHeight),
                width: defaultColWidth,
                height: defaultRowHeight,
            })
        }

        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [cursor.row, cursor.column, containerRef])

    if (!pos) return null

    return (
        <div
            className="absolute pointer-events-none z-[1000]"
            style={{
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                border: `2px solid ${cursor.color}`,
                backgroundColor: `${cursor.color}15`,
                transition: 'all 0.2s ease',
            }}
        >
            <div
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[11px] font-semibold text-white whitespace-nowrap shadow-md"
                style={{ backgroundColor: cursor.color }}
            >
                {cursor.username}
            </div>
        </div>
    )
}
