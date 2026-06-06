import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const email = (process.env.ADS_ADMIN_EMAIL || "admin@local").toLowerCase();
const password = process.env.ADS_ADMIN_PASSWORD || "admin12345";
const name = process.env.ADS_ADMIN_NAME || "Иператор";

await prisma.user.upsert({
  where: { email },
  update: { role: "admin", name },
  create: {
    email,
    name,
    role: "admin",
    passwordHash: hashPassword(password),
  },
});

console.log(`Admin ready: ${email}`);
if (!process.env.ADS_ADMIN_PASSWORD) {
  console.log("Default local password: admin12345");
}

await prisma.$disconnect();
