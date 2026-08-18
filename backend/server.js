const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const exercisesRouter = require('./routes/exercises');
const workoutsRouter = require('./routes/workouts');
const routinesRouter = require('./routes/routines');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/exercises', exercisesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/routines', routinesRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
