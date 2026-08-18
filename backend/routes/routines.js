const express = require('express');
const router = express.Router();
const Routine = require('../models/Routine');

// Get all routines
router.get('/', async (req, res) => {
  try {
    const routines = await Routine.find();
    res.json(routines);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch routines' });
  }
});

// Add a new routine
router.post('/', async (req, res) => {
  try {
    const routineData = req.body;
    if (!routineData || !routineData.id || !routineData.name) {
      return res.status(400).json({ error: 'Invalid routine data' });
    }

    const newRoutine = new Routine(routineData);
    await newRoutine.save();

    res.status(201).json(newRoutine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add routine' });
  }
});

// Update a routine
router.put('/:id', async (req, res) => {
  try {
    const routineId = req.params.id;
    const routineData = req.body;

    const updatedRoutine = await Routine.findOneAndUpdate(
      { id: routineId },
      { $set: routineData },
      { new: true }
    );

    if (!updatedRoutine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json(updatedRoutine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update routine' });
  }
});

// Delete a routine
router.delete('/:id', async (req, res) => {
  try {
    const routineId = req.params.id;
    
    const deletedRoutine = await Routine.findOneAndDelete({ id: routineId });
    if (!deletedRoutine) {
      return res.status(404).json({ error: 'Routine not found' });
    }

    res.json({ message: 'Routine deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete routine' });
  }
});

module.exports = router;
