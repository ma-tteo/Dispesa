'use client'

import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

// Pusher configuration
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '41901fd7a4c9fcd4b088'
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'

export function usePusher(
  groupId: string | null,
  onProductChange: (data: { action: 'create' | 'update' | 'delete'; productId?: string; productName?: string; userId?: string }) => void
) {
  const pusherRef = useRef<Pusher | null>(null)
  const channelRef = useRef<Pusher.Channel | null>(null)

  useEffect(() => {
    if (!groupId) return

    // Initialize Pusher client
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
    })

    pusherRef.current = pusher

    // Subscribe to group channel
    const channel = pusher.subscribe(`group-${groupId}`)
    channelRef.current = channel

    // Listen for product changes
    channel.bind('product-change', (data: { action: 'create' | 'update' | 'delete'; productId?: string; productName?: string; userId?: string }) => {
      onProductChange(data)
    })

    return () => {
      // Cleanup
      if (channelRef.current) {
        channelRef.current.unbind_all()
        pusher.unsubscribe(`group-${groupId}`)
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect()
      }
    }
  }, [groupId, onProductChange])

  return null
}
