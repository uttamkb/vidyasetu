import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } })
  console.log(subjects)
}
main().finally(() => prisma.$disconnect())
