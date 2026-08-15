const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash("demo123", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@postmost.co" },
    update: {},
    create: {
      email: "demo@postmost.co",
      name: "Demo User",
      password: hashed,
      accounts: {
        create: [
          { platform: "ebay", displayName: "Demo eBay", accessToken: null },
          { platform: "poshmark", displayName: "Demo Poshmark", accessToken: null },
        ],
      },
    },
  });
  console.log("Seeded user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
