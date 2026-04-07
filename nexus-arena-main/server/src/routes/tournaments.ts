import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        _count: {
          select: { entries: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new tournament (Admin or Organizer only)
router.post('/', async (req, res) => {
  try {
    const { title, gameTitle, startDate, maxTeams, entryFee, prizePool, creatorId } = req.body;
    
    // Role check: Only ORGANIZER or ADMIN can create
    const user = await prisma.user.findUnique({ where: { id: creatorId } });
    if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
      return res.status(403).json({ error: "Only Tournament Organizers can create tournaments." });
    }

    const tournament = await prisma.tournament.create({
      data: {
        title,
        gameTitle,
        startDate: new Date(startDate),
        maxTeams,
        entryFee,
        prizePool: prizePool || 0,
        status: 'REGISTRATION_OPEN'
      }
    });
    res.status(201).json(tournament);
  } catch (error: any) {
    console.error("Tournament creation error", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register a team for a tournament
router.post('/:tournamentId/register', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId, initiatorUserId } = req.body;

    // 1. Verify tournament exists and is open
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== "REGISTRATION_OPEN") {
      return res.status(400).json({ error: "Tournament is not open for registration" });
    }

    // 2. Verify team exists, initiator is Captain
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { user: true } } }
    });

    if (!team) return res.status(404).json({ error: "Team not found" });
    if (team.captainId !== initiatorUserId) {
      return res.status(403).json({ error: "Only the team captain can register for tournaments" });
    }

    // 3. Game ID Validation: Keep but don't enforce (as requested)
    const playersWithoutIds = team.members.filter(member => !member.user.riotId);
    if (playersWithoutIds.length > 0) {
      console.warn(`Registration proceeding with ${playersWithoutIds.length} players missing Riot IDs`);
    }

    // 4. Ensure no duplicate registration
    const existingEntry = await prisma.tournamentEntry.findUnique({
      where: { teamId_tournamentId: { teamId, tournamentId: tournament.id } }
    });
    if (existingEntry) return res.status(400).json({ error: "Team is already registered" });

    // 5. Create Registration Entry
    const entry = await prisma.tournamentEntry.create({
      data: {
        teamId,
        tournamentId: tournament.id,
        paymentStatus: tournament.entryFee > 0 ? "PENDING" : "PAID"
      }
    });

    res.status(201).json(entry);
  } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
  }
});

// Delete a tournament
router.delete('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    // Check if teams are registered
    const entriesCount = await prisma.tournamentEntry.count({
      where: { tournamentId }
    });

    if (entriesCount > 0) {
      return res.status(400).json({ error: "Cannot delete tournament with registered teams." });
    }

    await prisma.tournament.delete({ where: { id: tournamentId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Internal Error" });
  }
});

export default router;
