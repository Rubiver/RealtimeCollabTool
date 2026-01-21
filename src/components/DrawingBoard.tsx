'use client'

import { useEffect, useRef, useState } from 'react'

interface DrawingBoardProps {
  workspaceId: string
}

type Socket = any

export default function DrawingBoard({ workspaceId }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<any>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isDrawing, setIsDrawing] = useState(true)
  const [color, setColor] = useState('#6366f1')
  const [brushSize, setBrushSize] = useState(5)
  const [isFabricLoaded, setIsFabricLoaded] = useState(false)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [isPrivateMode, setIsPrivateMode] = useState(true)

  useEffect(() => {
    let canvas: any = null
    let socket: Socket | null = null

    const loadFabric = async () => {
      if (typeof window !== 'undefined' && canvasRef.current) {
        const fabricModule = await import('fabric')
        const fabric = fabricModule.fabric

        canvas = new fabric.Canvas(canvasRef.current, {
          width: 1000,
          height: 700,
          backgroundColor: '#ffffff',
          isDrawingMode: true,
          selection: false,
        })

        // 브러시 설정
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas)
        canvas.freeDrawingBrush.width = brushSize
        canvas.freeDrawingBrush.color = color

        fabricCanvasRef.current = canvas
        setIsFabricLoaded(true)

        const username = localStorage.getItem('username')
        if (!username) return

        // Socket.IO 동적 로드
        const { io } = await import('socket.io-client')
        socket = io('http://localhost:3001', {
          transports: ['websocket'],
          reconnection: true,
        })

        socket.on('connect', () => {
          console.log('DrawingBoard: Connected to server, Socket ID:', socket.id)
          socket?.emit('joinDrawing', { username, workspaceId })
          console.log('DrawingBoard: Joined workspace:', workspaceId)
          console.log('DrawingBoard: Event listeners registered:', socket.eventNames())
        })

        socket.on('connect_error', (error: Error) => {
          console.error('DrawingBoard: Connection error:', error)
        })

        // 다른 사용자의 그림 받기
        socket.on('drawingUpdate', (data: { type: string; data: any }) => {
          console.log('📥 [EVENT FIRED] drawingUpdate received!', {
            type: data.type,
            workspaceId,
            hasData: !!data.data,
            currentSocketId: socket.id,
            timestamp: new Date().toISOString()
          })

          if (!canvas) {
            console.error('❌ Canvas not available!')
            return
          }

          console.log('✅ Canvas is available, processing drawing...')

          if (data.type === 'path') {
            try {
              // Path 객체 직접 생성
              const path = new fabric.Path(data.data.path, {
                stroke: data.data.stroke,
                strokeWidth: data.data.strokeWidth,
                fill: data.data.fill || '',
                selectable: false,
              })
              canvas.add(path)
              canvas.renderAll()
              console.log('✅ Path added to canvas, total objects:', canvas.getObjects().length)
            } catch (error) {
              console.error('❌ Error adding path:', error)
            }
          } else if (data.type === 'clear') {
            canvas.clear()
            canvas.backgroundColor = '#ffffff'
            canvas.renderAll()
            console.log('✅ Canvas cleared')
          }
        })

        console.log('✅ drawingUpdate event listener registered')

        // 로컬에서 그림을 그릴 때 서버로 전송 (공개 모드일 때만)
        canvas.on('path:created', (e: any) => {
          const path = e.path
          if (socket && path && !isPrivateMode) {
            console.log('🎨 Path created locally (public mode), total objects:', canvas.getObjects().length)

            const pathData = {
              path: path.path,
              stroke: path.stroke,
              strokeWidth: path.strokeWidth,
              fill: path.fill || '',
            }

            console.log('📤 Sending drawing to server:', {
              workspaceId,
              pathData,
              socketId: socket.id
            })

            socket.emit('drawing', {
              data: {
                type: 'path',
                data: pathData,
              },
              workspaceId,
            })
          } else if (isPrivateMode) {
            console.log('🔒 Path created in private mode, not broadcasting')
          }
        })

        socketRef.current = socket
      }
    }

    loadFabric()

    return () => {
      if (canvas) {
        canvas.dispose()
      }
      if (socket) {
        socket.close()
      }
      socketRef.current = null
      fabricCanvasRef.current = null
      setIsFabricLoaded(false)
    }
  }, [workspaceId])

  // 브러시 설정 업데이트
  useEffect(() => {
    if (fabricCanvasRef.current && isFabricLoaded) {
      const canvas = fabricCanvasRef.current
      if (!canvas.freeDrawingBrush) {
        const fabricModule = require('fabric')
        canvas.freeDrawingBrush = new fabricModule.fabric.PencilBrush(canvas)
      }

      const brush = canvas.freeDrawingBrush
      brush.width = brushSize

      if (tool === 'eraser') {
        // 지우개: 흰색으로 그리기
        brush.color = '#ffffff'
      } else {
        brush.color = color
      }

      console.log('Brush updated:', { tool, color: brush.color, width: brush.width })
    }
  }, [brushSize, color, tool, isFabricLoaded])

  // 그리기 모드 토글
  useEffect(() => {
    if (fabricCanvasRef.current && isFabricLoaded) {
      fabricCanvasRef.current.isDrawingMode = isDrawing
    }
  }, [isDrawing, isFabricLoaded])

  const handleClear = () => {
    if (fabricCanvasRef.current && socketRef.current) {
      fabricCanvasRef.current.clear()
      fabricCanvasRef.current.backgroundColor = '#ffffff'
      fabricCanvasRef.current.renderAll()

      console.log('📤 Sending clear to server:', {
        workspaceId,
        socketId: socketRef.current.id
      })

      socketRef.current.emit('drawing', {
        data: { type: 'clear' },
        workspaceId
      })
    }
  }

  const handleUndo = () => {
    if (fabricCanvasRef.current) {
      const objects = fabricCanvasRef.current.getObjects()
      if (objects.length > 0) {
        fabricCanvasRef.current.remove(objects[objects.length - 1])
        fabricCanvasRef.current.renderAll()
      }
    }
  }

  const handleShareDrawing = () => {
    if (fabricCanvasRef.current && socketRef.current) {
      const canvas = fabricCanvasRef.current
      const objects = canvas.getObjects()

      console.log('📤 Sharing all drawings:', objects.length, 'objects')

      // 모든 객체를 순차적으로 전송
      objects.forEach((obj: any) => {
        if (obj.path) {
          const pathData = {
            path: obj.path,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            fill: obj.fill || '',
          }

          socketRef.current?.emit('drawing', {
            data: {
              type: 'path',
              data: pathData,
            },
            workspaceId,
          })
        }
      })

      console.log('✅ All drawings shared')
    }
  }

  const predefinedColors = [
    { name: '인디고', color: '#6366f1' },
    { name: '보라', color: '#a855f7' },
    { name: '핑크', color: '#ec4899' },
    { name: '빨강', color: '#ef4444' },
    { name: '주황', color: '#f97316' },
    { name: '노랑', color: '#eab308' },
    { name: '초록', color: '#22c55e' },
    { name: '파랑', color: '#3b82f6' },
    { name: '검정', color: '#000000' },
    { name: '회색', color: '#6b7280' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b-2 border-indigo-100 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 모드 표시 배지 */}
          <div className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${isPrivateMode
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }`}>
            {isPrivateMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                개인 모드
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                공개 모드
              </>
            )}
          </div>

          {/* 모드 전환 버튼 */}
          <button
            onClick={() => setIsPrivateMode(!isPrivateMode)}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${isPrivateMode
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
              }`}
          >
            {isPrivateMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                공개 모드로 전환
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                개인 모드로 전환
              </>
            )}
          </button>

          {/* 공유하기 버튼 (개인 모드일 때만 표시) */}
          {isPrivateMode && (
            <button
              onClick={handleShareDrawing}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              그림 공유하기
            </button>
          )}

          <div className="h-8 w-px bg-indigo-200"></div>

          {/* 도구 선택 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTool('pen')
                setIsDrawing(true)
              }}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${tool === 'pen'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:border-indigo-300'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              펜
            </button>

            <button
              onClick={() => {
                setTool('eraser')
                setIsDrawing(true)
              }}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${tool === 'eraser'
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:border-indigo-300'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              지우개
            </button>
          </div>

          <div className="h-8 w-px bg-indigo-200"></div>

          {/* 색상 선택 (펜 모드일 때만) */}
          {tool === 'pen' && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-gray-700">색상:</label>
                <div className="flex gap-2">
                  {predefinedColors.map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setColor(c.color)}
                      className={`w-8 h-8 rounded-lg transition-all shadow-md hover:shadow-lg hover:scale-110 ${color === c.color ? 'ring-2 ring-indigo-600 ring-offset-2' : ''
                        }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                  <div className="relative">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border-2 border-indigo-200 cursor-pointer hover:border-indigo-300 transition-colors"
                      title="커스텀 색상"
                    />
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-indigo-200"></div>
            </>
          )}

          {/* 브러시 크기 */}
          <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
            <label className="text-sm font-semibold text-gray-700">
              {tool === 'pen' ? '브러시' : '지우개'} 크기:
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32 accent-indigo-600"
            />
            <div className="bg-white px-3 py-1 rounded-md border border-indigo-200 min-w-[50px] text-center">
              <span className="text-sm font-semibold text-indigo-700">{brushSize}px</span>
            </div>
          </div>

          {/* 실행 취소 및 전체 지우기 */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleUndo}
              className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              실행 취소
            </button>

            <button
              onClick={handleClear}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              전체 지우기
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-4 border-white rounded-lg shadow-2xl bg-white"
          />
          {!isFabricLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">캔버스 로딩 중...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-indigo-50 border-t-2 border-indigo-100 px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-indigo-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {isPrivateMode ? (
              <>
                <strong>개인 모드:</strong> 그림이 본인에게만 보입니다. "그림 공유하기" 버튼을 눌러 다른 사용자와 공유하세요.
              </>
            ) : (
              <>
                <strong>공개 모드:</strong> 그린 내용이 실시간으로 다른 사용자에게 표시됩니다.
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}