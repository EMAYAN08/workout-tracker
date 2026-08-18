const express = require('express');
const router = express.Router();
const CustomExercise = require('../models/CustomExercise');

// Get all custom exercises
router.get('/custom', async (req, res) => {
  try {
    const exercises = await CustomExercise.find();
    res.json(exercises);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch custom exercises' });
  }
});

// Add new custom exercise
router.post('/custom', async (req, res) => {
  try {
    const { id, name, muscleGroup, gifUrl } = req.body;
    
    if (!id || !name || !muscleGroup) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newExercise = new CustomExercise({ id, name, muscleGroup, gifUrl });
    await newExercise.save();

    res.status(201).json(newExercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add custom exercise' });
  }
});

module.exports = router;
