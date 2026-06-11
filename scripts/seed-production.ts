import bcrypt from 'bcryptjs'

import { prisma } from '../src/shared/database/prisma'

const COMPANY_NAME = 'CODXIS ERP'
const PASSWORD = 'Codexis1020'

const SUPER_ADMIN = {
  name: 'Gustavo',
  email: 'admin.codxis@gmail.com',
  role: 'SUPER_ADMIN' as const,
  companyId: null,
}

const ADMIN = {
  name: 'Suporte CodXis',
  email: 'suporte.codxis@gmail.com',
  role: 'ADMIN' as const,
}

async function main() {
  let company = await prisma.company.findFirst({
    where: {
      name: COMPANY_NAME,
    },
  })

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        status: 'ACTIVE',
        plan: 'ENTERPRISE',
      },
    })

    console.log('Empresa criada')
  } else {
    console.log('Empresa já existe')
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  const superAdmin = await prisma.user.findUnique({
    where: {
      email: SUPER_ADMIN.email,
    },
  })

  if (!superAdmin) {
    await prisma.user.create({
      data: {
        ...SUPER_ADMIN,
        password: passwordHash,
      },
    })

    console.log('SUPER_ADMIN criado')
  } else {
    console.log('SUPER_ADMIN já existe')
  }

  const admin = await prisma.user.findUnique({
    where: {
      email: ADMIN.email,
    },
  })

  if (!admin) {
    await prisma.user.create({
      data: {
        ...ADMIN,
        password: passwordHash,
        companyId: company.id,
      },
    })

    console.log('ADMIN criado')
  } else {
    console.log('ADMIN já existe')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
