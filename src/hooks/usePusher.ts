'use client'

import { useEffect, useRef, useCallback } from 'react'
import Pusher from 'pusher-js'

// Pusher configuration
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '41901fd7a4c9fcd4b088'
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'

// Show browser notification
function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: 'dispensa-update',
      renotify: true,
    })
  }
}

export function usePusher(
  groupId: string | null,
  onProductChange: (data: { action: 'create' | 'update' | 'delete'; productId?: string; productName?: string; userId?: string }) => void,
  currentUserId?: string,
  notificationsEnabled?: boolean
) {
  const pusherRef = useRef<Pusher | null>(null)
  const channelRef = useRef<Pusher.Channel | null>(null)
  
  // Use refs to store callbacks to avoid reconnections
  const onProductChangeRef = useRef(onProductChange)
  const currentUserIdRef = useRef(currentUserId)
  const notificationsEnabledRef = useRef(notificationsEnabled)
  
  // Keep refs updated
  useEffect(() => {
    onProductChangeRef.current = onProductChange
  }, [onProductChange])
  
  useEffect(() => {
    currentUserIdRef.current = currentUserId
  }, [currentUserId])
  
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled
  }, [notificationsEnabled])

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

    // Listen for product changes - use refs in the handler to avoid reconnections
    channel.bind('product-change', (data: { action: 'create' | 'update' | 'delete'; productId?: string; productName?: string; userId?: string }) => {
      // Call the callback to update UI using ref
      onProductChangeRef.current(data)
      
      // Show browser notification if enabled and from another user
      if (notificationsEnabledRef.current && data.userId && data.userId !== currentUserIdRef.current) {
        let title = ''
        let body = ''
        
        switch (data.action) {
          case 'create':
            title = '🛒 Nuovo prodotto'
            body = `${data.productName || 'Un prodotto'} è stato aggiunto alla lista`
            break
          case 'update':
            title = '✏️ Prodotto aggiornato'
            body = `${data.productName || 'Un prodotto'} è stato modificato`
            break
          case 'delete':
            title = '🗑️ Prodotto rimosso'
            body = `${data.productName || 'Un prodotto'} è stato rimosso dalla lista`
            break
        }
        
        showBrowserNotification(title, body)
      }
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
  }, [groupId]) // Only depend on groupId - use refs for everything else

  return null
}
