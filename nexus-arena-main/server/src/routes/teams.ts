import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Get teams where user is captain
router.get('/captain/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const teams = await prisma.team.findMany({
      where: { captainId: userId },
      include: {
        members: { include: { user: true } }
      }
    });
    res.json(teams);
  } catch (error) {
    console.error("Fetch teams error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, logoUrl, captainId } = req.body;
    
    // Check if user exists, if not, create a basic user representation
    // Assuming user might be managed externally but we need an ID in our DB
    let user = await prisma.user.findUnique({ where: { id: captainId } });
    if (!user) {
      user = await prisma.user.create({ data: { id: captainId } });
    }

    const team = await prisma.team.create({
      data: {
        name,
        logoUrl,
        captainId,
        members: {
          create: [{ userId: captainId, role: 'CAPTAIN' }]
        }
      },
      include: {
        members: { include: { user: true } }
      }
    });

    res.status(201).json(team);
  } catch (error: any) {
    console.error("Team creation error:", error);
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
        entries: { include: { tournament: true } }
      }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });
    
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Add a member to a team
router.post('/:id/members', async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { userId } = req.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({ data: { id: userId } });
    }

    const newMember = await prisma.teamMember.create({
      data: { teamId, userId }
    });

    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User is already a member of this team' });
    }
    console.error("Add member error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Remove a member from a team
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { id: teamId, userId } = req.params;
    
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    
    if (team?.captainId === userId) {
      return res.status(400).json({ error: 'Captain cannot leave without assigning a new captain' });
    }

    await prisma.teamMember.delete({
       where: { teamId_userId: { teamId, userId } }
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
