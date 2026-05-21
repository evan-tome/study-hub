import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sessionsRouter from './routes/sessions';
import coursesRouter from './routes/courses';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/courses', coursesRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
