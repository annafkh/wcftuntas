import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const fallbackDatabaseUrl = "mysql://placeholder:placeholder@127.0.0.1:3306/wcftuntas";
const databaseUrl = process.env.DATABASE_URL ?? fallbackDatabaseUrl;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
