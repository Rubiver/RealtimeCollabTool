export interface Message {
  id: string
  username: string
  message: string
  timestamp: Date
}

export interface User {
  id: string
  username: string
}

export interface DrawingData {
  type: 'path' | 'clear'
  data?: {
    path?: string
    stroke?: string
    strokeWidth?: number
  }
}
