import { prisma } from '@/lib/db';

const defaultSources = [
  // Mathematics Sources
  {
    name: 'Khan Academy - Mathematics',
    url: 'https://www.khanacademy.org/math/ncert-class-9',
    type: 'WEBSITE' as const,
    subjectName: 'Mathematics',
  },
  {
    name: 'NCERT Mathematics Class 9',
    url: 'https://ncert.nic.in/textbook.php?iemh1=0-9',
    type: 'WEBSITE' as const,
    subjectName: 'Mathematics',
  },
  
  // Science Sources
  {
    name: 'Khan Academy - Science',
    url: 'https://www.khanacademy.org/science/ncert-class-9',
    type: 'WEBSITE' as const,
    subjectName: 'Science',
  },
  {
    name: 'NCERT Science Class 9',
    url: 'https://ncert.nic.in/textbook.php?iesc1=0-9',
    type: 'WEBSITE' as const,
    subjectName: 'Science',
  },
  
  // Social Science Sources
  {
    name: 'NCERT Social Science Class 9',
    url: 'https://ncert.nic.in/textbook.php?iess1=0-9',
    type: 'WEBSITE' as const,
    subjectName: 'Social Science',
  },
  
  // English Sources
  {
    name: 'NCERT English Class 9',
    url: 'https://ncert.nic.in/textbook.php?ienf1=0-9',
    type: 'WEBSITE' as const,
    subjectName: 'English',
  },
  
  // Hindi Sources
  {
    name: 'NCERT Hindi Class 9',
    url: 'https://ncert.nic.in/textbook.php?ihdk1=0-9',
    type: 'WEBSITE' as const,
    subjectName: 'Hindi',
  },
];

async function seedContentSources() {
  console.log('🌱 Seeding content sources...');

  for (const source of defaultSources) {
    try {
      // Find subject by name
      const subject = await prisma.subject.findFirst({
        where: { name: source.subjectName },
      });

      if (!subject) {
        console.log(`⚠️ Subject "${source.subjectName}" not found, skipping source: ${source.name}`);
        continue;
      }

      // Check if source already exists
      const existing = await prisma.contentSource.findUnique({
        where: { url: source.url },
      });

      if (existing) {
        console.log(`✅ Source already exists: ${source.name}`);
        continue;
      }

      // Create the source
      await prisma.contentSource.create({
        data: {
          name: source.name,
          url: source.url,
          type: source.type,
          subjectId: subject.id,
          isActive: true,
        },
      });

      console.log(`✅ Added source: ${source.name}`);
    } catch (error) {
      console.error(`❌ Error adding source ${source.name}:`, error);
    }
  }

  console.log('✅ Content sources seeding completed!');
}

// Run the seed function
seedContentSources()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });