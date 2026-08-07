import mariadb from 'mariadb'
import type { Connection, SqlError } from 'mariadb'

import { env } from './config/env'
import { app } from './app'
import { databaseConfig } from './shared/database/prisma'

async function diagnoseDatabaseConnection() {
  let connection: Connection | undefined

  try {
    connection = await mariadb.createConnection(databaseConfig)
    await connection.query('SELECT 1')
    app.log.info({ event: 'database_connection_ok' })
  } catch (error) {
    const databaseError = error as SqlError

    app.log.error({
      event: 'database_connection_failed',
      code: databaseError.code,
      errno: databaseError.errno,
      sqlState: databaseError.sqlState,
      message: databaseError.message,
    })
  } finally {
    await connection?.end()
  }
}

async function start() {
  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST,
    })

    app.log.info(`Server running on ${env.HOST}:${env.PORT}`)
    void diagnoseDatabaseConnection()
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

start()
