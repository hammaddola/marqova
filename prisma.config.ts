import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A placeholder keeps `prisma generate` working on machines without a database.
    url: process.env.DATABASE_URL ?? "postgresql://marqova:marqova@localhost:5432/marqova",
  },
});
