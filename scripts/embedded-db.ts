/**
 * Runs a local PostgreSQL server without Docker (useful on machines where Docker
 * is unavailable). Data lives in ./.data/postgres. Point DATABASE_URL at:
 *   postgresql://marqova:marqova@localhost:5433/marqova
 *
 * Usage: npm run db:embedded   (Ctrl+C to stop)
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".data/postgres");
const port = Number(process.env.EMBEDDED_PG_PORT ?? 5433);

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "marqova",
    password: "marqova",
    port,
    persistent: true,
    onLog: () => {},
  });

  const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) await pg.createDatabase("marqova");

  console.log(`PostgreSQL ready on postgresql://marqova:marqova@localhost:${port}/marqova`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  // Keep the process alive.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
