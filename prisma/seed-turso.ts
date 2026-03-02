import { createClient } from '@libsql/client'
import { nanoid } from 'nanoid'

const client = createClient({
  url: 'libsql://dispesa-matto244.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI0NzAxMDksImlkIjoiMDE5Y2FmNzItMjMwMS03OWRmLThkYzEtYTc3MjcwYzllNjk3IiwicmlkIjoiNzAwZGI4MTAtZWIyNy00YWRjLTkyYjAtMzA5ZTgwYjI3ZDhhIn0.EA-df307ffgZEOk4S51F0TSG4PukCEfj5aygrnvV4aLkdKTuQbF-TCsXqFvwlZEbmqm6dANA7HxF8589rvpEBQ'
})

const DEFAULT_CATEGORIES = [
  { name: 'Frutta e Verdura', icon: '🍎', color: '#4CAF50' },
  { name: 'Latticini e Uova', icon: '🥛', color: '#2196F3' },
  { name: 'Carne', icon: '🥩', color: '#F44336' },
  { name: 'Pesce', icon: '🐟', color: '#00BCD4' },
  { name: 'Surgelati', icon: '🧊', color: '#03A9F4' },
  { name: 'Pasta e Riso', icon: '🍝', color: '#FF9800' },
  { name: 'Pane e Cereali', icon: '🍞', color: '#795548' },
  { name: 'Condimenti', icon: '🫒', color: '#8BC34A' },
  { name: 'Bevande', icon: '🥤', color: '#009688' },
  { name: 'Dolci e Snack', icon: '🍪', color: '#E91E63' },
  { name: 'Igiene Casa', icon: '🧹', color: '#9C27B0' },
  { name: 'Igiene Personale', icon: '🧴', color: '#673AB7' },
  { name: 'Bebè', icon: '🍼', color: '#FFC107' },
  { name: 'Animali', icon: '🐕', color: '#795548' },
  { name: 'Farmacia', icon: '💊', color: '#F44336' },
  { name: 'Cartoleria', icon: '📝', color: '#607D8B' },
  { name: 'Casalinghi', icon: '🏠', color: '#9E9E9E' },
  { name: 'Altro', icon: '📦', color: '#757575' },
]

const DEFAULT_STORES = [
  { name: 'Conad', icon: '🛒', color: '#E53935' },
  { name: 'Coop', icon: '🛒', color: '#43A047' },
  { name: 'Esselunga', icon: '🛒', color: '#FFA000' },
  { name: 'Lidl', icon: '🛒', color: '#1E88E5' },
  { name: 'Aldi', icon: '🛒', color: '#FF5722' },
  { name: 'Carrefour', icon: '🛒', color: '#009688' },
  { name: 'Eurospin', icon: '🛒', color: '#E91E63' },
  { name: 'Pam', icon: '🛒', color: '#F44336' },
  { name: 'Simply', icon: '🛒', color: '#9C27B0' },
  { name: 'Unes', icon: '🛒', color: '#673AB7' },
  { name: 'NaturaSì', icon: '🛒', color: '#4CAF50' },
  { name: 'Farmacia', icon: '💊', color: '#2196F3' },
  { name: 'Altro', icon: '🏪', color: '#9E9E9E' },
]

async function seed() {
  console.log('🌱 Seeding Turso database...')

  // Seed categories
  console.log('📦 Seeding categories...')
  for (const cat of DEFAULT_CATEGORIES) {
    const id = nanoid()
    await client.execute({
      sql: `INSERT OR IGNORE INTO Category (id, name, icon, color) VALUES (?, ?, ?, ?)`,
      args: [id, cat.name, cat.icon, cat.color]
    })
  }

  // Seed stores
  console.log('🏪 Seeding stores...')
  for (const store of DEFAULT_STORES) {
    const id = nanoid()
    await client.execute({
      sql: `INSERT OR IGNORE INTO Store (id, name, icon, color) VALUES (?, ?, ?, ?)`,
      args: [id, store.name, store.icon, store.color]
    })
  }

  // Verify
  const categories = await client.execute('SELECT COUNT(*) as count FROM Category')
  const stores = await client.execute('SELECT COUNT(*) as count FROM Store')

  console.log(`✅ Seed completed!`)
  console.log(`   Categories: ${categories.rows[0].count}`)
  console.log(`   Stores: ${stores.rows[0].count}`)
}

seed().catch(console.error)
