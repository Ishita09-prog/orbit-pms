import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';

async function main() {
  // Keeps first-time deployments simple: the schema is created on boot. Disable with AUTO_MIGRATE=false.
  if (process.env.AUTO_MIGRATE !== 'false') await migrate();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Failed to start server', { message: err.message, stack: err.stack });
  process.exit(1);
});
