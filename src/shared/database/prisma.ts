import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { env } from '../../config/env'

// Prisma's schema/CLI expects a `mysql://` URL, while the MariaDB driver
// adapter expects the equivalent `mariadb://` protocol at runtime.
const runtimeDatabaseUrl = env.DATABASE_URL
  .trim()
  .replace(/^DATABASE_URL\s*=\s*/i, '')
  .replace(/^mysql:\/\//i, 'mariadb://')

const adapter = new PrismaMariaDb(runtimeDatabaseUrl, {
  onConnectionError(error) {
    console.error({
      event: 'database_connection_error',
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      message: error.message,
    })
  },
})

export const prisma = new PrismaClient({
  adapter,
})
