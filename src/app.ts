import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import mariadb from "mariadb";
import type { SqlError } from "mariadb";

import { env } from "./config/env";
import { loggerConfig } from "./config/logger";
import { errorHandler } from "./shared/errors/error-handler";
import { registerHooks } from "./shared/hooks";
import { registerMiddlewares } from "./shared/middlewares";
import { databaseConfig } from "./shared/database/prisma";
import { registerModules } from "./modules";

export function buildApp() {
  const app = Fastify({
    logger: loggerConfig,
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  app.setErrorHandler(errorHandler);

  app.get("/", async () => {
    return {
      message: "CodXis ERP API online",
      status: "ok",
    };
  });

  app.get("/health", async () => {
    return {
      status: "ok",
    };
  });

  app.get("/health/database", async (_request, reply) => {
    let connection: Awaited<ReturnType<typeof mariadb.createConnection>> | undefined;

    try {
      connection = await mariadb.createConnection(databaseConfig);
      await connection.query("SELECT 1");

      return { status: "ok" };
    } catch (error) {
      const databaseError = error as SqlError;

      return reply.status(503).send({
        status: "error",
        code: databaseError.code ?? "UNKNOWN_DATABASE_ERROR",
        errno: databaseError.errno ?? null,
        sqlState: databaseError.sqlState ?? null,
      });
    } finally {
      await connection?.end();
    }
  });

  registerHooks(app);
  registerMiddlewares(app);
  registerModules(app);

  app.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      message: `Rota ${request.method}:${request.url} nao encontrada`,
      error: "Nao encontrado",
      statusCode: 404,
    });
  });

  return app;
}

export const app = buildApp();
