'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export default function DrawingBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<any>(null)
  const socketRef = useRef<Socket | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
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
          socket?.emit('joinDrawing', { username })
        })

        // Receive drawing updates from other users
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

        // Handle path creation
        canvas.on('path:created', (e: any) => {
          const path = e.path
          if (socket && path) {
            socket.emit('drawing', {
              type: 'path',
              data: {
                path: path.path,
                stroke: path.stroke,
                strokeWidth: path.strokeWidth,
              },
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
  }, [])

  const handleClear = () => {
    if (fabricCanvasRef.current && socketRef.current) {
      fabricCanvasRef.current.clear()
      fabricCanvasRef.current.backgroundColor = '#ffffff'
      fabricCanvasRef.current.renderAll()
      socketRef.current.emit('drawing', { type: 'clear' })
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => setIsDrawing(!isDrawing)}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isDrawing
              ? 'bg-primary-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {isDrawing ? '그리기 중' : '그리기 시작'}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">색상:</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">크기:</label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32"
          />
          <span className="text-sm text-gray-600 w-8">{brushSize}px</span>
        </div>
        <button
          onClick={handleClear}
          className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
        >
          전체 지우기
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas ref={canvasRef} className="border border-gray-300 shadow-lg" />
      </div>
    </div>
  )
}
