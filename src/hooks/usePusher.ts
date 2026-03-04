'use client'

import { useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

// Pusher configuration
const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '41901fd7a4c9fcd4b088'
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu'

// Request notification permission
async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

// Show browser notification
function showBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/icons/icon.svg',
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

  useEffect(() => {
    if (!groupId) return

    // Request notification permission on mount
    if (notificationsEnabled) {
      requestNotificationPermission()
    }

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
      // Call the callback to update UI
      onProductChange(data)
      
      // Show browser notification if enabled and from another user
      if (notificationsEnabled && data.userId && data.userId !== currentUserId) {
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
  }, [groupId, onProductChange, currentUserId, notificationsEnabled])

  return null
}
