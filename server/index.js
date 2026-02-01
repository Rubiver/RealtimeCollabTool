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
    const roomName = `drawing-${workspaceId}`
    socket.join(roomName)
    console.log(`${username} joined drawing room: ${roomName} (Socket: ${socket.id})`)

    // 현재 룸에 있는 소켓 확인
    const room = io.sockets.adapter.rooms.get(roomName)
    console.log(`👥 Users in ${roomName}:`, room ? Array.from(room) : [])
  })

  socket.on('drawing', ({ data, workspaceId = 'default' }) => {
    const roomName = `drawing-${workspaceId}`
    console.log(`📤 Broadcasting drawing to workspace: ${workspaceId}, type: ${data.type}, from socket: ${socket.id}`)

    // 현재 룸에 있는 소켓 확인
    const room = io.sockets.adapter.rooms.get(roomName)
    console.log(`👥 Current users in ${roomName}:`, room ? Array.from(room) : [])
    console.log(`📨 Broadcasting to ${room ? room.size - 1 : 0} other users`)

    socket.to(roomName).emit('drawingUpdate', data)
    console.log(`✅ Drawing broadcasted to ${roomName}`)
  })

  // Store spreadsheet data by workspace
  const workspaceSheets = new Map()

  // Store cell cursors by workspace: Map<workspaceId, Map<socketId, cursorInfo>>
  const workspaceCursors = new Map()

  // Helper to get cursors for a workspace
  const getCursors = (workspaceId) => {
    if (!workspaceCursors.has(workspaceId)) {
      workspaceCursors.set(workspaceId, new Map())
    }
    return workspaceCursors.get(workspaceId)
  }

  // ... existing code ...

  socket.on('joinSpreadsheet', ({ username, workspaceId = 'default', storage }) => {
    const roomName = `spreadsheet-${workspaceId}`
    socket.join(roomName)
    console.log(`${username} joined spreadsheet room: ${roomName}`)

    // Store username in socket for later use
    socket.spreadsheetUsername = username
    socket.spreadsheetWorkspaceId = workspaceId

    // If we don't have data for this workspace yet, use the provided storage (initial state)
    if (!workspaceSheets.has(workspaceId)) {
      // Use the storage provided by the client, or a default fallback if empty
      const initialData = (storage && storage.length > 0) ? storage : [{ name: 'Sheet1', celldata: [], row: 50, column: 26 }]
      workspaceSheets.set(workspaceId, initialData)
    }

    // Send current server-side state to the newly joined user
    socket.emit('spreadsheetUpdate', workspaceSheets.get(workspaceId))

    // Send existing cursors to the new user
    const cursors = getCursors(workspaceId)
    const cursorList = Array.from(cursors.values())
    socket.emit('spreadsheetCursors', cursorList)
    console.log(`📍 Sent ${cursorList.length} existing cursors to ${username}`)
  })

  // Handle cell selection/cursor updates
  socket.on('cellSelect', ({ username, workspaceId, row, column, sheetIndex, color }) => {
    const roomName = `spreadsheet-${workspaceId}`
    const cursors = getCursors(workspaceId)

    const cursorInfo = {
      socketId: socket.id,
      username,
      row,
      column,
      sheetIndex,
      color,
      timestamp: Date.now()
    }

    cursors.set(socket.id, cursorInfo)

    // Broadcast cursor update to all other users in the room
    socket.to(roomName).emit('cursorUpdate', cursorInfo)
    console.log(`📍 ${username} selected cell [${row}, ${column}] in sheet ${sheetIndex}`)
  })

  // Handle cursor leave (when user deselects or leaves)
  socket.on('cellDeselect', ({ workspaceId }) => {
    const roomName = `spreadsheet-${workspaceId}`
    const cursors = getCursors(workspaceId)

    if (cursors.has(socket.id)) {
      cursors.delete(socket.id)
      socket.to(roomName).emit('cursorRemove', { socketId: socket.id })
      console.log(`📍 Cursor removed for socket ${socket.id}`)
    }
  })

  socket.on('spreadsheetChange', ({ data, workspaceId = 'default' }) => {
    // Update the server-side state
    workspaceSheets.set(workspaceId, data)
    console.log(`💾 Spreadsheet state saved for workspace ${workspaceId}`)

    // We do NOT broadcast full data update here to avoid conflicts with Op-based sync.
    // Ops are used for realtime sync. This event determines the "checkpoint" or "full state" for new users.
  })

  socket.on('spreadsheetOp', ({ ops, workspaceId = 'default' }) => {
    const roomName = `spreadsheet-${workspaceId}`
    console.log(`📤 Broadcasting spreadsheet operations to ${roomName}:`, ops)
    // Broadcast operations to other users in the same workspace
    socket.to(`spreadsheet-${workspaceId}`).emit('spreadsheetOp', ops)
  })

  socket.on('getUsers', ({ workspaceId = 'default' }) => {
    const users = getWorkspaceUsers(workspaceId)
    socket.emit('users', Array.from(users.values()))
    console.log(`Sent users list for workspace ${workspaceId} to ${socket.id}`)
  })

  socket.on('disconnect', () => {
    // Remove cursor if user was in a spreadsheet
    if (socket.spreadsheetWorkspaceId) {
      const workspaceId = socket.spreadsheetWorkspaceId
      const roomName = `spreadsheet-${workspaceId}`
      const cursors = getCursors(workspaceId)

      if (cursors.has(socket.id)) {
        cursors.delete(socket.id)
        io.to(roomName).emit('cursorRemove', { socketId: socket.id })
        console.log(`📍 Cursor removed for disconnected user ${socket.spreadsheetUsername}`)
      }
    }

    // Find and remove user from all workspaces
    for (const [workspaceId, users] of workspaceUsers.entries()) {
      const user = users.get(socket.id)
      if (user) {
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
