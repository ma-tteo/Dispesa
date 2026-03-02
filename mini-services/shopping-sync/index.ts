import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Store users per group
const groupUsers = new Map<string, Set<string>>()

interface GroupJoinData {
  groupId: string
  userId: string
}

interface ProductChangeData {
  groupId: string
  action: 'create' | 'update' | 'delete'
  productId: string
}

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`)

  // Join a group room
  socket.on('join-group', (data: GroupJoinData) => {
    const { groupId, userId } = data
    
    socket.join(`group:${groupId}`)
    socket.data.groupId = groupId
    socket.data.userId = userId
    
    // Track users in group
    if (!groupUsers.has(groupId)) {
      groupUsers.set(groupId, new Set())
    }
    groupUsers.get(groupId)!.add(socket.id)
    
    console.log(`User ${userId} joined group ${groupId}`)
    
    // Notify others in the group
    socket.to(`group:${groupId}`).emit('user-joined', { userId, socketId: socket.id })
  })

  // Handle product changes
  socket.on('product-change', (data: ProductChangeData) => {
    const { groupId, action, productId } = data
    
    console.log(`Product ${action}: ${productId} in group ${groupId}`)
    
    // Broadcast to all users in the group except sender
    socket.to(`group:${groupId}`).emit('product-updated', {
      productId,
      action,
      updatedBy: socket.data.userId
    })
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    const { groupId, userId } = socket.data
    
    if (groupId && groupUsers.has(groupId)) {
      groupUsers.get(groupId)!.delete(socket.id)
      
      if (groupUsers.get(groupId)!.size === 0) {
        groupUsers.delete(groupId)
      }
      
      // Notify others
      socket.to(`group:${groupId}`).emit('user-left', { userId, socketId: socket.id })
    }
    
    console.log(`User disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`Shopping Sync WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
