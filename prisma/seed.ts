import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create a lightbox
  const lightbox = await prisma.lightboxes.create({
    data: {
      name: 'Test Lightbox',
      description: 'A lightbox for testing',
      keywords: ['test'],
      types: ['image'],
    },
  });

  // Create a share link
  await prisma.share_links.create({
    data: {
      lightbox_id: lightbox.id,
      token: 'test_token_no_pw',
      name: 'Test Share Link',
      revoked: false,
    },
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 