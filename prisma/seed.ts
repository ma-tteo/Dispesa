import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { DEFAULT_CATEGORIES, DEFAULT_STORES } from '../src/lib/constants'

// Configurazione Turso
const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://dispesa-matto244.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const adapter = new PrismaLibSQL(libsql)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database on Turso...')

  // Seed categories
  console.log('📦 Seeding categories...')
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        icon: cat.icon,
        color: cat.color,
      },
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
      },
    })
  }

  // Seed stores
  console.log('🏪 Seeding stores...')
  for (const store of DEFAULT_STORES) {
    await prisma.store.upsert({
      where: { name: store.name },
      update: {
        icon: store.icon,
        color: store.color,
      },
      create: {
        name: store.name,
        icon: store.icon,
        color: store.color,
      },
    })
  }

  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
