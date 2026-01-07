const { Server } = require('socket.io')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

const users = new Map()
const messages = []

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join', ({ username }) => {
    if (!username) {
      console.log('Join attempt without username')
      return
    }
    
    // 이미 같은 socket.id로 등록된 사용자가 있는지 확인
    const existingUser = users.get(socket.id)
    if (existingUser && existingUser.username === username) {
      // 같은 사용자가 다시 join 요청한 경우, 목록만 업데이트
      console.log(`${username} already joined with this socket, updating user list`)
      socket.emit('users', Array.from(users.values()))
      return
    }
    
    // 같은 username으로 다른 socket.id에 이미 등록된 사용자가 있는지 확인하고 제거
    const duplicateSockets = []
    for (const [socketId, user] of users.entries()) {
      if (user.username === username && socketId !== socket.id) {
        duplicateSockets.push(socketId)
      }
    }
    
    // 중복된 모든 연결 제거
    duplicateSockets.forEach(socketId => {
      const oldSocket = io.sockets.sockets.get(socketId)
      if (oldSocket) {
        oldSocket.disconnect(true) // 강제 연결 종료
      }
      users.delete(socketId)
      console.log(`Removed duplicate user ${username} with socket ${socketId}`)
    })
    
    // 새 사용자 추가 또는 업데이트
    users.set(socket.id, { id: socket.id, username })
    
    // 새 사용자 추가 알림 (자신을 제외한 모든 클라이언트에게)
    socket.broadcast.emit('userJoined', { username })
    
    // 모든 클라이언트에게 업데이트된 사용자 목록 전송
    io.emit('users', Array.from(users.values()))
    console.log(`${username} joined with socket ${socket.id} (Total users: ${users.size})`)
    console.log('Current users:', Array.from(users.values()).map(u => u.username))
  })

  socket.on('message', ({ username, message }) => {
    const msg = {
      id: Date.now().toString(),
      username,
      message,
      timestamp: new Date(),
    }
    messages.push(msg)
    io.emit('message', msg)
  })

  socket.on('joinDrawing', ({ username }) => {
    console.log(`${username} joined drawing room`)
  })

  socket.on('drawing', (data) => {
    socket.broadcast.emit('drawingUpdate', data)
  })

  socket.on('joinDocument', ({ username }) => {
    console.log(`${username} joined document room`)
  })

  socket.on('documentChange', (data) => {
    socket.broadcast.emit('documentUpdate', data)
  })

  socket.on('getUsers', () => {
    socket.emit('users', Array.from(users.values()))
    console.log(`Sent users list to ${socket.id}:`, Array.from(users.values()))
  })

  socket.on('disconnect', () => {
    const user = users.get(socket.id)
    if (user) {
      socket.broadcast.emit('userLeft', { username: user.username })
      users.delete(socket.id)
      io.emit('users', Array.from(users.values()))
      console.log(`${user.username} left`)
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
