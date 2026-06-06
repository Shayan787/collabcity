const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Vibe tags
  const vibeTags = [
    { name: 'Developer', emoji: '💻' },
    { name: 'Designer', emoji: '🎨' },
    { name: 'Video Editor', emoji: '🎬' },
    { name: 'Content Creator', emoji: '📱' },
    { name: 'Musician', emoji: '🎵' },
    { name: 'Photographer', emoji: '📸' },
    { name: 'Marketer', emoji: '📣' },
    { name: 'Entrepreneur', emoji: '🚀' },
    { name: 'Gamer', emoji: '🎮' },
    { name: 'Writer', emoji: '✍️' },
  ];

  for (const tag of vibeTags) {
    await prisma.vibeTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log('✅ Vibe tags seeded');

  // Sample skills
  const skills = [
    'React', 'Next.js', 'Node.js', 'Python', 'Figma', 'Photoshop',
    'Premiere Pro', 'After Effects', 'Flutter', 'Django', 'MongoDB',
    'PostgreSQL', 'TypeScript', 'Tailwind', 'Video Editing', 'Copywriting',
  ];

  for (const name of skills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('✅ Skills seeded');

  // Sample users
  const password = await bcrypt.hash('password123', 12);

  const users = [
    { name: 'Ali Hassan', username: 'alihassan', email: 'ali@demo.com', city: 'Karachi', area: 'DHA', bio: 'Full-stack dev building cool stuff 🚀', vibeTags: ['Developer', 'Entrepreneur'], skills: ['React', 'Node.js', 'PostgreSQL'] },
    { name: 'Sara Khan', username: 'sarakhan', email: 'sara@demo.com', city: 'Karachi', area: 'Gulshan', bio: 'UI/UX designer who loves clean interfaces ✨', vibeTags: ['Designer', 'Content Creator'], skills: ['Figma', 'Photoshop'] },
    { name: 'Hamza Malik', username: 'hamzamalik', email: 'hamza@demo.com', city: 'Karachi', area: 'Clifton', bio: 'Video editor & content creator 🎬', vibeTags: ['Video Editor', 'Content Creator'], skills: ['Premiere Pro', 'After Effects', 'Video Editing'] },
    { name: 'Zara Ahmed', username: 'zaraahmed', email: 'zara@demo.com', city: 'Karachi', area: 'PECHS', bio: 'Marketing strategist & brand builder 📣', vibeTags: ['Marketer', 'Entrepreneur'], skills: ['Copywriting'] },
  ];

  for (const userData of users) {
    const { vibeTags: userVibeTags, skills: userSkills, ...rest } = userData;

    const user = await prisma.user.upsert({
      where: { email: rest.email },
      update: {},
      create: { ...rest, password },
    });

    // Add vibe tags
    for (const tagName of userVibeTags) {
      const tag = await prisma.vibeTag.findUnique({ where: { name: tagName } });
      if (tag) {
        await prisma.userVibeTag.upsert({
          where: { userId_vibeTagId: { userId: user.id, vibeTagId: tag.id } },
          update: {},
          create: { userId: user.id, vibeTagId: tag.id },
        });
      }
    }

    // Add skills
    for (const skillName of userSkills) {
      const skill = await prisma.skill.findUnique({ where: { name: skillName } });
      if (skill) {
        await prisma.userSkill.upsert({
          where: { userId_skillId: { userId: user.id, skillId: skill.id } },
          update: {},
          create: { userId: user.id, skillId: skill.id },
        });
      }
    }
  }
  console.log('✅ Sample users seeded');

  // Sample project
  const poster = await prisma.user.findUnique({ where: { email: 'zara@demo.com' } });
  if (poster) {
    const existing = await prisma.project.findFirst({ where: { posterId: poster.id } });
    if (!existing) {
      await prisma.project.create({
        data: {
          title: 'Need a short promo video for my brand',
          description: 'Looking for a video editor to create a 60-second promo video for my clothing brand. You will get raw footage + brief. Final delivery: edited video with captions and background music.',
          budget: 8000,
          currency: 'PKR',
          posterId: poster.id,
          skills: { create: [{ skillName: 'Video Editing' }, { skillName: 'Premiere Pro' }] },
        },
      });
    }
  }
  console.log('✅ Sample project seeded');

  console.log('\n🎉 Seed complete!');
  console.log('Demo accounts (password: password123):');
  users.forEach(u => console.log(`  ${u.email} - ${u.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
