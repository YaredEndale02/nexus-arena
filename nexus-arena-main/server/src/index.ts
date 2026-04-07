import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
