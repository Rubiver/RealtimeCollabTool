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

// Store spreadsheet data by workspace (전역으로 이동 - 모든 소켓이 공유)
const workspaceSheets = new Map()

// Store cell cursors by workspace: Map<workspaceId, Map<socketId, cursorInfo>>
const workspaceCursors = new Map()

// Helper function to get users in a workspace
const getWorkspaceUsers = (workspaceId) => {
  if (!workspaceUsers.has(workspaceId)) {
    workspaceUsers.set(workspaceId, new Map())
  }
  return workspaceUsers.get(workspaceId)
}

// Helper to get cursors for a workspace
const getCursors = (workspaceId) => {
  if (!workspaceCursors.has(workspaceId)) {
    workspaceCursors.set(workspaceId, new Map())
  }
  return workspaceCursors.get(workspaceId)
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


  // ======== 스프레드시트 (Univer 기반) ========

  socket.on('joinSpreadsheet', ({ username, workspaceId = 'default', snapshot }) => {
    const roomName = `spreadsheet-${workspaceId}`
    socket.join(roomName)
    console.log(`📊 ${username} joined spreadsheet room: ${roomName}`)

    socket.spreadsheetUsername = username
    socket.spreadsheetWorkspaceId = workspaceId

    // 서버에 스냅샷이 있으면 새 사용자에게 전송
    if (workspaceSheets.has(workspaceId)) {
      socket.emit('spreadsheetSnapshot', workspaceSheets.get(workspaceId))
      console.log(`📊 Sent existing snapshot to ${username}`)
    } else if (snapshot) {
      // 첫 번째 사용자의 스냅샷을 서버에 저장
      workspaceSheets.set(workspaceId, snapshot)
      console.log(`📊 Saved initial snapshot from ${username}`)
    }

    // 기존 커서 정보 전송
    const cursors = getCursors(workspaceId)
    socket.emit('spreadsheetCursors', Array.from(cursors.values()))
  })

  // 셀 단위 변경 이벤트 (실시간 동기화 핵심)
  socket.on('cellChange', ({ workspaceId, username, row, column, value }) => {
    const roomName = `spreadsheet-${workspaceId}`

    // 서버 스냅샷 업데이트 (셀 단위)
    const snapshot = workspaceSheets.get(workspaceId)
    if (snapshot && snapshot.sheets) {
      const sheetId = Object.keys(snapshot.sheets)[0]
      if (sheetId) {
        if (!snapshot.sheets[sheetId].cellData) {
          snapshot.sheets[sheetId].cellData = {}
        }
        if (!snapshot.sheets[sheetId].cellData[row]) {
          snapshot.sheets[sheetId].cellData[row] = {}
        }
        snapshot.sheets[sheetId].cellData[row][column] = { v: value }
      }
    }

    // 다른 사용자에게 브로드캐스트
    socket.to(roomName).emit('cellChanged', { row, column, value, username })
    console.log(`📊 ${username} changed cell [${row}, ${column}] = ${value}`)
  })

  // 셀 선택/커서 업데이트
  socket.on('cellSelect', ({ username, workspaceId, row, column, color }) => {
    const roomName = `spreadsheet-${workspaceId}`
    const cursors = getCursors(workspaceId)

    const cursorInfo = {
      socketId: socket.id,
      username,
      row,
      column,
      color,
      timestamp: Date.now()
    }

    cursors.set(socket.id, cursorInfo)
    socket.to(roomName).emit('cursorUpdate', cursorInfo)
  })

  // 커서 제거
  socket.on('cellDeselect', ({ workspaceId }) => {
    const roomName = `spreadsheet-${workspaceId}`
    const cursors = getCursors(workspaceId)

    if (cursors.has(socket.id)) {
      cursors.delete(socket.id)
      socket.to(roomName).emit('cursorRemove', { socketId: socket.id })
    }
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
