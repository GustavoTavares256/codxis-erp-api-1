import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

import { AppError } from './app-error'

export function errorHandler(
  error: FastifyError,
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: 'Dados invalidos',
      errors: error.issues,
    })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        message: 'Registro duplicado',
      })
    }

    if (error.code === 'P2003') {
      return reply.status(400).send({
        message: 'Registro relacionado invalido',
      })
    }

    if (error.code === 'P2022') {
      return reply.status(500).send({
        message: 'Banco de dados desatualizado. Execute as migrations do Prisma.',
      })
    }
  }

  console.error(error)

  return reply.status(500).send({
    message: error.message,
  })
}
