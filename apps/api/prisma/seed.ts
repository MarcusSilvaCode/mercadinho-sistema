import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash1 = await bcrypt.hash("admin123", 10);
  const passwordHash2 = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "admin1" },
    update: {},
    create: {
      fullName: "Administrador 1",
      username: "admin1",
      passwordHash: passwordHash1,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "admin2" },
    update: {},
    create: {
      fullName: "Administrador 2",
      username: "admin2",
      passwordHash: passwordHash2,
      active: true,
    },
  });

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Meu Mercadinho",
      shortName: "Mercadinho",
      defaultMargin: 30,
      maxDiscountPercent: 30,
      sessionTimeoutMin: 15,
      backupDayOfWeek: 0,
      backupHour: 3,
    },
  });

  console.log("Seed concluído: admin1 / admin2 (senha: admin123) — TROQUE em produção.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
