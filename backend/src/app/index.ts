import { config } from "../config.js";
import { logger } from "../logger.js";
import { closePool } from "../db/mysql.js";
import { buildApp } from "../http/server.js";
import { initCrmSocket } from "../realtime/crmSocket.js";

export { buildApp };

export async function main(): Promise<void> {
  const app = await buildApp();
  await app.ready();
  initCrmSocket(app.server);
  const shutdown = async () => {
    await app.close();
    await closePool();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  try {
    await app.listen({ port: config.port, host: config.listenHost });
    logger.info(
      { port: config.port, host: config.listenHost },
      "Backend listening"
    );
  } catch (err) {
    logger.fatal(err);
    process.exit(1);
  }
}
