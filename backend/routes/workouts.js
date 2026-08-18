const express = require('express');
const router = express.Router();
const Workout = require('../models/Workout');

// Get all workouts
router.get('/', async (req, res) => {
  try {
    const workouts = await Workout.find().sort({ timestamp: -1 });
    res.json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Save a new workout
router.post('/', async (req, res) => {
  try {
    const workoutData = req.body;
    
    if (!workoutData || !workoutData.id) {
      return res.status(400).json({ error: 'Invalid workout data' });
    }

    const newWorkout = new Workout(workoutData);
    await newWorkout.save();

    res.status(201).json(newWorkout);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save workout' });
  }
});

module.exports = router;
