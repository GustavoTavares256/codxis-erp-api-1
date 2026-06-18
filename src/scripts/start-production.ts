import { spawnSync } from 'node:child_process'

import {
  disconnectProductSchemaRepair,
  repairProductSchema,
} from './repair-product-schema'

function deployMigrations() {
  const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(prismaCommand, ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: false,
  })

  if (result.status === 0) {
    return
  }

  const reason = result.error?.message || `exit code ${result.status ?? 'unknown'}`
  console.warn(`Prisma migrate deploy failed (${reason}). Continuing with schema repair.`)
}

async function main() {
  deployMigrations()
  try {
    await repairProductSchema()
  } finally {
    await disconnectProductSchemaRepair()
  }

  await import('../server.js')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
