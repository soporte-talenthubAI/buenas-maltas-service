import path from "node:path";
import { defineConfig } from "prisma/config";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/buenas_maltas?schema=public";

export default defineConfig({
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: DATABASE_URL,
  },
  migrate: {
    async url() {
      return DATABASE_URL;
    },
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
