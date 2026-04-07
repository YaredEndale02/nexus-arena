import { randomUUID } from 'crypto';
import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();
const isPrismaKnownError = (error: unknown): error is { code: string } =>
  typeof error === 'object' && error !== null && 'code' in error;

const ensureUser = async (input: { id?: string; name?: string; role?: string; riotId?: string }) => {
  if (!input.id) return null;

  return prisma.user.upsert({
    where: { id: input.id },
    update: {
      name: input.name,
      role: input.role,
      riotId: input.riotId,
    },
    create: {
      id: input.id,
      name: input.name,
      role: input.role ?? 'PLAYER',
      riotId: input.riotId,
    },
  });
};

// Get teams where user is captain
router.get('/captain/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const teams = await prisma.team.findMany({
      where: { captainId: userId },
      include: {
        members: { include: { user: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (error) {
    console.error('Fetch teams error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, logoUrl, captainId, captainName, captainRole, captainRiotId } = req.body;

    const user = await ensureUser({
      id: captainId,
      name: captainName,
      role: captainRole,
      riotId: captainRiotId,
    });

    if (!user) {
      return res.status(400).json({ error: 'A valid captain is required.' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        logoUrl,
        captainId,
        members: {
          create: [{ userId: captainId, role: 'CAPTAIN' }],
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    res.status(201).json(team);
  } catch (error: unknown) {
    console.error('Team creation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a team
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterId, requesterName, requesterRole, requesterRiotId, name, logoUrl } = req.body;

    const requester = await ensureUser({
      id: requesterId,
      name: requesterName,
      role: requesterRole,
      riotId: requesterRiotId,
    });
    const team = await prisma.team.findUnique({ where: { id } });

    if (!requester || !team) return res.status(404).json({ error: 'Team not found' });
    if (team.captainId !== requester.id && requester.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only the team captain or an admin can edit this team.' });
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        name,
        logoUrl,
      },
      include: {
        members: { include: { user: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Team update error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get a team by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        entries: { include: { tournament: true } },
      },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    res.json(team);
  } catch (error: unknown) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a member to a team
router.post('/:id/members', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { requesterId, requesterName, requesterRole, requesterRiotId, userId, memberName, memberRiotId } = req.body;

    const requester = await ensureUser({
      id: requesterId,
      name: requesterName,
      role: requesterRole,
      riotId: requesterRiotId,
    });
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!requester || (team.captainId !== requester.id && requester.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only the team captain or an admin can add members.' });
    }

    const memberId = userId || `user-${randomUUID()}`;
    await ensureUser({
      id: memberId,
      name: memberName,
      role: 'PLAYER',
      riotId: memberRiotId,
    });

    await prisma.teamMember.create({
      data: { teamId, userId: memberId },
    });

    const updatedTeam = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { include: { user: true } },
      },
    });

    res.status(201).json(updatedTeam);
  } catch (error: unknown) {
    if (isPrismaKnownError(error) && error.code === 'P2002') {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove a member from a team
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id: teamId, userId } = req.params;
    const requesterId = typeof req.query.requesterId === 'string' ? req.query.requesterId : undefined;
    const requesterRole = typeof req.query.requesterRole === 'string' ? req.query.requesterRole : undefined;

    const requester = requesterId ? await ensureUser({ id: requesterId, role: requesterRole }) : null;
    const team = await prisma.team.findUnique({ where: { id: teamId } });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!requester || (team.captainId !== requester.id && requester.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Only the team captain or an admin can remove members.' });
    }

    if (team.captainId === userId) {
      return res.status(400).json({ error: 'Captain cannot leave without assigning a new captain' });
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    res.status(204).send();
  } catch (error: unknown) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
