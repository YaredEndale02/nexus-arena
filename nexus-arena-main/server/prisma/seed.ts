import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before seeding.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create Mock User (Organizer & Captain)
  const user = await prisma.user.upsert({
    where: { id: 'user-1' },
    update: {
      name: 'FragMaster99',
      role: 'ORGANIZER',
      riotId: 'FragMaster#NA1'
    },
    create: {
      id: 'user-1',
      name: 'FragMaster99',
      role: 'ORGANIZER',
      riotId: 'FragMaster#NA1'
    }
  });

  // 2. Create a Team for the user
  await prisma.team.upsert({
    where: { id: 'team-shadow-wolves' },
    update: {
      name: 'Shadow Wolves',
      captainId: user.id,
    },
    create: {
      id: 'team-shadow-wolves',
      name: 'Shadow Wolves',
      captainId: user.id,
      members: {
        create: [
          { userId: user.id, role: 'CAPTAIN' }
        ]
      }
    }
  });

  // 3. Create Sample Tournaments
  const tournaments = [
    {
      id: 'tournament-valorant-champions-series',
      title: 'Valorant Champions Series',
      gameTitle: 'Valorant',
      startDate: new Date('2026-04-15'),
      maxTeams: 32,
      entryFee: 0,
      prizePool: 50000,
      status: 'REGISTRATION_OPEN'
    },
    {
      id: 'tournament-league-world-cup',
      title: 'League of Legends World Cup',
      gameTitle: 'League of Legends',
      startDate: new Date('2026-04-10'),
      maxTeams: 16,
      entryFee: 50,
      prizePool: 100000,
      status: 'REGISTRATION_OPEN'
    },
    {
      id: 'tournament-cs2-major-qualifier',
      title: 'CS2 Major Qualifier',
      gameTitle: 'Counter-Strike 2',
      startDate: new Date('2026-04-20'),
      maxTeams: 64,
      entryFee: 25,
      prizePool: 75000,
      status: 'REGISTRATION_OPEN'
    }
  ];

  for (const t of tournaments) {
    await prisma.tournament.upsert({
      where: { id: t.id },
      update: t,
      create: t,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
