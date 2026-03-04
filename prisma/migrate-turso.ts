import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://dispesa-matto244.aws-eu-west-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function migrate() {
  console.log('🚀 Creating tables on Turso...')

  // Create User table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT,
      password TEXT,
      avatar TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ User table created')

  // Create FamilyGroup table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS FamilyGroup (
      id TEXT PRIMARY KEY,
      name TEXT,
      inviteCode TEXT UNIQUE,
      ownerId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ownerId) REFERENCES User(id)
    )
  `)
  console.log('✅ FamilyGroup table created')

  // Create FamilyMember table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS FamilyMember (
      id TEXT PRIMARY KEY,
      userId TEXT,
      groupId TEXT,
      joinedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (groupId) REFERENCES FamilyGroup(id) ON DELETE CASCADE,
      UNIQUE (userId, groupId)
    )
  `)
  console.log('✅ FamilyMember table created')

  // Create List table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS List (
      id TEXT PRIMARY KEY,
      name TEXT,
      icon TEXT,
      color TEXT,
      groupId TEXT,
      createdById TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (groupId) REFERENCES FamilyGroup(id) ON DELETE CASCADE,
      FOREIGN KEY (createdById) REFERENCES User(id)
    )
  `)
  console.log('✅ List table created')

  // Create Category table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      icon TEXT,
      color TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Category table created')

  // Create Store table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Store (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE,
      icon TEXT,
      color TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log('✅ Store table created')

  // Create Product table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS Product (
      id TEXT PRIMARY KEY,
      name TEXT,
      categoryId TEXT,
      storeId TEXT,
      forAllStores INTEGER DEFAULT 0,
      price REAL,
      weight TEXT,
      quantity INTEGER DEFAULT 1,
      imageUrl TEXT,
      status TEXT DEFAULT 'TO_BUY',
      notes TEXT,
      listId TEXT,
      createdById TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES Category(id),
      FOREIGN KEY (storeId) REFERENCES Store(id),
      FOREIGN KEY (listId) REFERENCES List(id) ON DELETE CASCADE,
      FOREIGN KEY (createdById) REFERENCES User(id)
    )
  `)
  console.log('✅ Product table created')

  // Create UserSettings table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS UserSettings (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE,
      theme TEXT DEFAULT 'light',
      primaryColor TEXT DEFAULT 'mint',
      fontSize TEXT DEFAULT 'medium',
      compactMode INTEGER DEFAULT 0,
      showPrices INTEGER DEFAULT 1,
      showImages INTEGER DEFAULT 0,
      defaultStoreId TEXT,
      currency TEXT DEFAULT 'EUR',
      language TEXT DEFAULT 'it',
      notifications INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `)
  console.log('✅ UserSettings table created')

  // Create indexes
  await client.execute(`CREATE INDEX IF NOT EXISTS List_groupId_idx ON List(groupId)`)
  await client.execute(`CREATE INDEX IF NOT EXISTS Product_listId_idx ON Product(listId)`)
  console.log('✅ Indexes created')

  console.log('🎉 All tables created successfully!')
}

migrate().catch(console.error)
