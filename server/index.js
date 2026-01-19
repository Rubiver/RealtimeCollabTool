const { Server } = require('socket.io')
const http = require('http')

const server = http.createServer()
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

// Store users by workspace: Map<workspaceId, Map<socketId, user>>
const workspaceUsers = new Map()

// Helper function to get users in a workspace
const getWorkspaceUsers = (workspaceId) => {
  if (!workspaceUsers.has(workspaceId)) {
    workspaceUsers.set(workspaceId, new Map())
  }
  return workspaceUsers.get(workspaceId)
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join', ({ username, workspaceId = 'default' }) => {
    if (!username) {
      console.log('Join attempt without username')
      return
    }

    // Join the workspace room
    socket.join(workspaceId)

    // Get users map for this workspace
    const users = getWorkspaceUsers(workspaceId)

    // Check if user already exists in this workspace
    const existingUser = users.get(socket.id)
    if (existingUser && existingUser.username === username) {
      console.log(`${username} already joined workspace ${workspaceId}, updating user list`)
      socket.emit('users', Array.from(users.values()))
      return
    }

    // Remove duplicate users with same username in this workspace
    const duplicateSockets = []
    for (const [socketId, user] of users.entries()) {
      if (user.username === username && socketId !== socket.id) {
        duplicateSockets.push(socketId)
      }
    }

    duplicateSockets.forEach(socketId => {
      const oldSocket = io.sockets.sockets.get(socketId)
      if (oldSocket) {
        oldSocket.disconnect(true)
      }
      users.delete(socketId)
      console.log(`Removed duplicate user ${username} from workspace ${workspaceId}`)
    })

    // Add user to workspace
    users.set(socket.id, { id: socket.id, username, workspaceId })

    // Notify others in the workspace
    socket.to(workspaceId).emit('userJoined', { username })

    // Send updated user list to all users in the workspace
    io.to(workspaceId).emit('users', Array.from(users.values()))
    console.log(`${username} joined workspace ${workspaceId} (Total users in workspace: ${users.size})`)
  })

  socket.on('message', ({ username, message, workspaceId = 'default' }) => {
    const msg = {
      id: Date.now().toString(),
      username,
      message,
      timestamp: new Date(),
    }
    // Send message only to users in the same workspace
    io.to(workspaceId).emit('message', msg)
  })

  socket.on('joinDrawing', ({ username, workspaceId = 'default' }) => {
    socket.join(`drawing-${workspaceId}`)
    console.log(`${username} joined drawing room for workspace ${workspaceId}`)
  })

  socket.on('drawing', ({ data, workspaceId = 'default' }) => {
    // Broadcast drawing updates only to users in the same workspace
    socket.to(`drawing-${workspaceId}`).emit('drawingUpdate', data)
  })

  socket.on('joinDocument', ({ username, workspaceId = 'default' }) => {
    socket.join(`document-${workspaceId}`)
    console.log(`${username} joined document room for workspace ${workspaceId}`)
  })

  socket.on('documentChange', ({ data, workspaceId = 'default' }) => {
    // Broadcast document changes only to users in the same workspace
    socket.to(`document-${workspaceId}`).emit('documentUpdate', data)
  })

  socket.on('getUsers', ({ workspaceId = 'default' }) => {
    const users = getWorkspaceUsers(workspaceId)
    socket.emit('users', Array.from(users.values()))
    console.log(`Sent users list for workspace ${workspaceId} to ${socket.id}`)
  })

  socket.on('disconnect', () => {
    // Find and remove user from all workspaces
    let removedUser = null
    let removedWorkspaceId = null

    for (const [workspaceId, users] of workspaceUsers.entries()) {
      const user = users.get(socket.id)
      if (user) {
        removedUser = user
        removedWorkspaceId = workspaceId
        users.delete(socket.id)

        // Notify others in the workspace
        socket.to(workspaceId).emit('userLeft', { username: user.username })

        // Send updated user list to workspace
        io.to(workspaceId).emit('users', Array.from(users.values()))

        console.log(`${user.username} left workspace ${workspaceId}`)
        break
      }
    }
  })
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
