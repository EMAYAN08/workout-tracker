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

// GET /api/routines
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.routines || []);
});

// POST /api/routines (Create new)
router.post('/', (req, res) => {
  const routine = req.body;
  if (!routine.name || !routine.exercises) {
    return res.status(400).json({ error: 'Routine must have a name and exercises array' });
  }

  const db = getDb();
  if (!db.routines) db.routines = [];

  const newRoutine = {
    ...routine,
    id: `rt_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.routines.push(newRoutine);
  saveDb(db);

  res.status(201).json(newRoutine);
});

// PUT /api/routines/:id (Edit existing)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const db = getDb();
  if (!db.routines) db.routines = [];

  const routineIndex = db.routines.findIndex(r => r.id === id);
  if (routineIndex === -1) {
    return res.status(404).json({ error: 'Routine not found' });
  }

  db.routines[routineIndex] = {
    ...db.routines[routineIndex],
    ...updates,
    id, // Ensure ID cannot be changed
    updatedAt: new Date().toISOString()
  };

  saveDb(db);
  res.json(db.routines[routineIndex]);
});

// DELETE /api/routines/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  if (!db.routines) db.routines = [];
  
  const routineIndex = db.routines.findIndex(r => r.id === id);
  if (routineIndex === -1) {
    return res.status(404).json({ error: 'Routine not found' });
  }

  db.routines.splice(routineIndex, 1);
  saveDb(db);

  res.status(204).send();
});

module.exports = router;
