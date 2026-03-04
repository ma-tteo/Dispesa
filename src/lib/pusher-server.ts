import Pusher from 'pusher'

// Pusher server instance for backend
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '2122948',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '41901fd7a4c9fcd4b088',
  secret: process.env.PUSHER_SECRET || '0fbfe2a35020f7d32a79',
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true,
})

// Helper to broadcast product changes
export async function broadcastProductChange(
  groupId: string,
  data: {
    action: 'create' | 'update' | 'delete'
    productId?: string
    productName?: string
    userId?: string
  }
) {
  try {
    await pusherServer.trigger(`group-${groupId}`, 'product-change', data)
  } catch (error) {
    console.error('[Pusher] Error broadcasting:', error)
  }
}
