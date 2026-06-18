import type { FastifyReply, FastifyRequest } from 'fastify'

import { prisma } from '../database/prisma'

const COMPANY_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE']
const LICENSE_BLOCKED_MESSAGE =
  'Sua licença está bloqueada ou expirada. Entre em contato com a CodXis.'

async function validateCompanyAccess(companyId: string, reply: FastifyReply) {
  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      status: true,
      licenseExpiresAt: true,
    },
  })

  if (!company) {
    return reply.status(403).send({
      message: 'Empresa nao encontrada para este usuario',
    })
  }

  if (company.status === 'BLOCKED' || company.status === 'EXPIRED') {
    return reply.status(403).send({
      message: LICENSE_BLOCKED_MESSAGE,
    })
  }

  if (company.licenseExpiresAt && company.licenseExpiresAt < new Date()) {
    return reply.status(403).send({
      message: LICENSE_BLOCKED_MESSAGE,
    })
  }

  return undefined
}

export async function ensureCompanyActive(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const userPayload = request.user as {
    companyId?: string | null
    impersonating?: boolean
    sub: string
    role: string
  }

  if (userPayload.role === 'SUPER_ADMIN') {
    return reply.status(403).send({
      message: 'Selecione uma empresa antes de acessar recursos da empresa',
    })
  }

  if (userPayload.role === 'SUPPORT' && userPayload.impersonating) {
    if (!userPayload.companyId) {
      return reply.status(403).send({
        message: 'Empresa nao encontrada para o modo suporte',
      })
    }

    return validateCompanyAccess(userPayload.companyId, reply)
  }

  if (COMPANY_ROLES.includes(userPayload.role) && !userPayload.companyId) {
    return reply.status(403).send({
      message: 'Usuario de empresa sem empresa vinculada',
    })
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userPayload.sub,
    },
    include: {
      company: true,
    },
  })

  if (!user || !user.companyId || !user.company) {
    return reply.status(403).send({
      message: 'Empresa nao encontrada para este usuario',
    })
  }

  return validateCompanyAccess(user.companyId, reply)
}
