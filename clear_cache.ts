import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("Deleting all CachedPost records...");
    const res = await prisma.cachedPost.deleteMany({});
    console.log(`Deleted ${res.count} records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
