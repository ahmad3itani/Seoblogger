import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const session = await prisma.crawlSession.findFirst({
    orderBy: { startedAt: "desc" },
    include: { scannedPages: { include: { issues: true } } }
  });
  if (session && session.scannedPages.length > 0) {
    console.log(JSON.stringify(session.scannedPages[0], null, 2));
  }
}
main().finally(() => prisma.$disconnect());
