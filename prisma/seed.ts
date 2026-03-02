import { PrismaClient } from '@prisma/client'
import { DEFAULT_CATEGORIES, DEFAULT_STORES } from '../src/lib/constants'

// Set DATABASE_URL to persistent location before Prisma initializes
const persistentDbPath = '/home/z/.dispensa-data/dispensa.db'
process.env.DATABASE_URL = `file:${persistentDbPath}`

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

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
