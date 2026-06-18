import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma configuration. Replaces the deprecated `prisma` key in package.json.
// The connection URL still lives in prisma/schema.prisma (url = env("DATABASE_URL"))
// for Prisma 6, so we only declare the schema path and the seed command here.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node seed.js",
  },
});
