const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');

const getDb = () => {
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
};

const saveDb = (data) => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// GET /api/workouts
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.workouts);
});

// POST /api/workouts
router.post('/', (req, res) => {
  const workout = req.body;
  if (!workout.exercises || workout.exercises.length === 0) {
    return res.status(400).json({ error: 'Workout must have exercises' });
  }

  const db = getDb();
  const newWorkout = {
    ...workout,
    id: `wk_${Date.now()}`,
    timestamp: new Date().toISOString()
  };

  db.workouts.push(newWorkout);
  saveDb(db);

  res.status(201).json(newWorkout);
});

module.exports = router;
