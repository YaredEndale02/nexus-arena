import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

type ActorPayload = {
  id?: string;
  name?: string;
  role?: string;
  riotId?: string;
};

const ORGANIZER_ROLES = new Set(['ORGANIZER', 'ADMIN']);
const TOURNAMENT_MUTABLE_STATUSES = new Set(['DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED']);

const normalizeActor = async (actor: ActorPayload) => {
  if (!actor.id) return null;

  return prisma.user.upsert({
    where: { id: actor.id },
    update: {
      name: actor.name,
      role: actor.role ?? 'PLAYER',
      riotId: actor.riotId,
    },
    create: {
      id: actor.id,
      name: actor.name,
      role: actor.role ?? 'PLAYER',
      riotId: actor.riotId,
    },
  });
};

const canManageTournament = (user: { id: string; role: string }, tournament: { organizerId: string | null }) =>
  user.role === 'ADMIN' || tournament.organizerId === user.id;

// Get all tournaments
router.get('/', async (req, res) => {
  try {
    const organizerId = typeof req.query.organizerId === 'string' ? req.query.organizerId : undefined;

    const tournaments = await prisma.tournament.findMany({
      where: organizerId ? { organizerId } : undefined,
      include: {
        _count: {
          select: { entries: true, matches: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    res.json(tournaments);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new tournament (Admin or Organizer only)
router.post('/', async (req, res) => {
  try {
    const { title, gameTitle, startDate, maxTeams, entryFee, prizePool, creatorId, creatorName, creatorRole, creatorRiotId } =
      req.body;

    const user = await normalizeActor({
      id: creatorId,
      name: creatorName,
      role: creatorRole,
      riotId: creatorRiotId,
    });

    if (!user || !ORGANIZER_ROLES.has(user.role)) {
      return res.status(403).json({ error: 'Only Tournament Organizers can create tournaments.' });
    }

    const tournament = await prisma.tournament.create({
      data: {
        title,
        gameTitle,
        startDate: new Date(startDate),
        maxTeams: Number(maxTeams),
        entryFee: Number(entryFee),
        prizePool: Number(prizePool) || 0,
        status: 'DRAFT',
        organizerId: user.id,
      },
    });

    res.status(201).json(tournament);
  } catch (error) {
    console.error('Tournament creation error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update tournament details
router.patch('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { actorId, actorName, actorRole, actorRiotId, title, gameTitle, startDate, maxTeams, entryFee, prizePool } =
      req.body;

    const actor = await normalizeActor({
      id: actorId,
      name: actorName,
      role: actorRole,
      riotId: actorRiotId,
    });
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!actor || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!ORGANIZER_ROLES.has(actor.role) || !canManageTournament(actor, tournament)) {
      return res.status(403).json({ error: 'You do not have permission to edit this tournament.' });
    }

    if (!TOURNAMENT_MUTABLE_STATUSES.has(tournament.status)) {
      return res.status(400).json({ error: 'Completed or cancelled tournaments cannot be edited.' });
    }

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        title,
        gameTitle,
        startDate: startDate ? new Date(startDate) : undefined,
        maxTeams: maxTeams !== undefined ? Number(maxTeams) : undefined,
        entryFee: entryFee !== undefined ? Number(entryFee) : undefined,
        prizePool: prizePool !== undefined ? Number(prizePool) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Tournament update error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Change tournament status
router.post('/:tournamentId/status', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { actorId, actorName, actorRole, actorRiotId, status } = req.body;

    const actor = await normalizeActor({
      id: actorId,
      name: actorName,
      role: actorRole,
      riotId: actorRiotId,
    });
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!actor || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!ORGANIZER_ROLES.has(actor.role) || !canManageTournament(actor, tournament)) {
      return res.status(403).json({ error: 'You do not have permission to change this tournament status.' });
    }

    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status },
    });

    res.json(updated);
  } catch (error) {
    console.error('Tournament status change error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register a team for a tournament
router.post('/:tournamentId/register', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId, initiatorUserId } = req.body;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.status !== 'REGISTRATION_OPEN') {
      return res.status(400).json({ error: 'Tournament is not open for registration' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { user: true } } },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.captainId !== initiatorUserId) {
      return res.status(403).json({ error: 'Only the team captain can register for tournaments' });
    }

    const existingEntry = await prisma.tournamentEntry.findUnique({
      where: { teamId_tournamentId: { teamId, tournamentId: tournament.id } },
    });
    if (existingEntry) return res.status(400).json({ error: 'Team is already registered' });

    const registeredTeams = await prisma.tournamentEntry.count({ where: { tournamentId } });
    if (registeredTeams >= tournament.maxTeams) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    const entry = await prisma.tournamentEntry.create({
      data: {
        teamId,
        tournamentId: tournament.id,
        paymentStatus: tournament.entryFee > 0 ? 'PENDING' : 'PAID',
      },
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Error' });
  }
});

// Get match reports for a tournament
router.get('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const matches = await prisma.match.findMany({
      where: { tournamentId },
      orderBy: [{ scheduledAt: 'asc' }, { roundLabel: 'asc' }],
    });

    res.json(matches);
  } catch (error) {
    console.error('Fetch matches error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a match report stub
router.post('/:tournamentId/matches', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { actorId, actorName, actorRole, actorRiotId, roundLabel, team1Name, team2Name, scheduledAt } = req.body;

    const actor = await normalizeActor({
      id: actorId,
      name: actorName,
      role: actorRole,
      riotId: actorRiotId,
    });
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!actor || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!ORGANIZER_ROLES.has(actor.role) || !canManageTournament(actor, tournament)) {
      return res.status(403).json({ error: 'You do not have permission to create matches for this tournament.' });
    }

    const match = await prisma.match.create({
      data: {
        tournamentId,
        roundLabel,
        team1Name,
        team2Name,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      },
    });

    res.status(201).json(match);
  } catch (error) {
    console.error('Create match error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Report match scores
router.patch('/:tournamentId/matches/:matchId/report', async (req, res) => {
  try {
    const { tournamentId, matchId } = req.params;
    const { actorId, actorName, actorRole, actorRiotId, team1Score, team2Score, status } = req.body;

    const actor = await normalizeActor({
      id: actorId,
      name: actorName,
      role: actorRole,
      riotId: actorRiotId,
    });
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    const match = await prisma.match.findUnique({ where: { id: matchId } });

    if (!actor || !tournament || !match || match.tournamentId !== tournamentId) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!ORGANIZER_ROLES.has(actor.role) || !canManageTournament(actor, tournament)) {
      return res.status(403).json({ error: 'You do not have permission to report this match.' });
    }

    const score1 = Number(team1Score);
    const score2 = Number(team2Score);
    const winnerName = score1 === score2 ? null : score1 > score2 ? match.team1Name : match.team2Name;

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        team1Score: score1,
        team2Score: score2,
        status: status ?? 'COMPLETED',
        winnerName,
      },
    });

    res.json(updatedMatch);
  } catch (error) {
    console.error('Report match error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete a tournament
router.delete('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : undefined;
    const actorRole = typeof req.query.actorRole === 'string' ? req.query.actorRole : undefined;

    const actor = actorId ? await normalizeActor({ id: actorId, role: actorRole }) : null;
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

    if (!actor || !tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!ORGANIZER_ROLES.has(actor.role) || !canManageTournament(actor, tournament)) {
      return res.status(403).json({ error: 'You do not have permission to delete this tournament.' });
    }

    const entriesCount = await prisma.tournamentEntry.count({
      where: { tournamentId },
    });

    if (entriesCount > 0) {
      return res.status(400).json({ error: 'Cannot delete tournament with registered teams.' });
    }

    await prisma.tournament.delete({ where: { id: tournamentId } });
    res.status(204).send();
  } catch (error) {
    console.error('Tournament delete error:', error);
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
