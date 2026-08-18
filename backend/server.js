require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const exercisesRouter = require('./routes/exercises');
const workoutsRouter = require('./routes/workouts');
const routinesRouter = require('./routes/routines');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('No MONGODB_URI found. Please set it in .env');
}

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
