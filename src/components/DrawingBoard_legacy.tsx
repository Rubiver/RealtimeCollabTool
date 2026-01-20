'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface DrawingBoardProps {
  workspaceId: string
}

export default function DrawingBoard({ workspaceId }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<any>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#6366f1')
  const [brushSize, setBrushSize] = useState(5)
  const [isFabricLoaded, setIsFabricLoaded] = useState(false)

  useEffect(() => {
    let canvas: any = null
    let socket: Socket | null = null

    const loadFabric = async () => {
      if (typeof window !== 'undefined' && canvasRef.current) {
        const fabricModule = await import('fabric')
        const fabric = fabricModule.fabric
        canvas = new fabric.Canvas(canvasRef.current, {
          width: 800,
          height: 600,
          backgroundColor: '#ffffff',
        })

        fabricCanvasRef.current = canvas
        setIsFabricLoaded(true)

        const username = localStorage.getItem('username')
        if (!username) return

        socket = io('http://localhost:3001', {
          transports: ['websocket'],
        })

        socket.on('connect', () => {
          socket?.emit('joinDrawing', { username, workspaceId })
        })

        socket.on('drawingUpdate', (data: { type: string; data: any }) => {
          if (!canvas) return

          if (data.type === 'path') {
            try {
              const path = new fabric.Path(data.data.path, {
                stroke: data.data.stroke,
                strokeWidth: data.data.strokeWidth,
                fill: '',
              })
              canvas.add(path)
              canvas.renderAll()
            } catch (error) {
              console.error('Error adding path:', error)
            }
          } else if (data.type === 'clear') {
            canvas.clear()
            canvas.backgroundColor = '#ffffff'
            canvas.renderAll()
          }
        })

        canvas.on('path:created', (e: any) => {
          const path = e.path
          if (socket && path) {
            socket.emit('drawing', {
              data: {
                type: 'path',
                data: {
                  path: path.path,
                  stroke: path.stroke,
                  strokeWidth: path.strokeWidth,
                },
              },
              workspaceId,
            })
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

  const handleClear = () => {
    if (fabricCanvasRef.current && socketRef.current) {
      fabricCanvasRef.current.clear()
      fabricCanvasRef.current.backgroundColor = '#ffffff'
      fabricCanvasRef.current.renderAll()
      socketRef.current.emit('drawing', {
        data: { type: 'clear' },
        workspaceId
      })
    }
  }

  const updateBrush = () => {
    if (fabricCanvasRef.current && isFabricLoaded) {
      const brush = fabricCanvasRef.current.freeDrawingBrush
      if (brush) {
        brush.width = brushSize
        brush.color = color
      }
    }
  }

  useEffect(() => {
    if (fabricCanvasRef.current && isFabricLoaded) {
      fabricCanvasRef.current.isDrawingMode = isDrawing
      updateBrush()
    }
  }, [isDrawing, color, brushSize, isFabricLoaded])

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
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2 ${isDrawing
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:border-indigo-300'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {isDrawing ? '그리기 중' : '그리기 시작'}
          </button>

          <div className="h-8 w-px bg-indigo-200"></div>

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

          <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200">
            <label className="text-sm font-semibold text-gray-700">브러시 크기:</label>
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

          <button
            onClick={handleClear}
            className="ml-auto px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            전체 지우기
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border-4 border-white rounded-lg shadow-2xl"
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
    </div>
  )
}