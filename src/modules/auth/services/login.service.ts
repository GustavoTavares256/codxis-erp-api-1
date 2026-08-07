import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'

import { prisma } from '../../../shared/database/prisma'
import type { LoginInput } from '../schemas/login.schema'
import { AppError } from '../../../shared/errors/app-error'

const COMPANY_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE']

export async function loginService(app: FastifyInstance, data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
    include: {
      company: true,
    },
  })

  if (!user) {
    throw new AppError('E-mail ou senha invalidos', 401)
  }

  const passwordMatches = await bcrypt.compare(data.password, user.password)

  if (!passwordMatches) {
    throw new AppError('E-mail ou senha invalidos', 401)
  }

  if (user.role === 'SUPER_ADMIN' && user.companyId) {
    throw new Error('Usuario SUPER_ADMIN nao deve estar vinculado a empresa')
  }

  if (COMPANY_ROLES.includes(user.role) && !user.companyId) {
    throw new Error('Usuario de empresa sem empresa vinculada')
  }

  const companyId = user.role === 'SUPER_ADMIN' ? null : user.companyId

  const token = app.jwt.sign({
    sub: user.id,
    role: user.role,
    companyId,
  })

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId,
      companyName: user.role === 'SUPER_ADMIN' ? null : user.company?.name ?? null,
    },
  }
}
