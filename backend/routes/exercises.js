const express = require('express');
const https = require('https');
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
    const { id, name, muscleGroup, gifUrl, defaultSets, unitSaved } = req.body;
    
    if (!id || !name || !muscleGroup) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newExercise = new CustomExercise({ 
      id, name, muscleGroup, gifUrl, unitSaved: unitSaved || 'lbs', defaultSets: defaultSets || [] 
    });
    await newExercise.save();

    res.status(201).json(newExercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add custom exercise' });
  }
});

// Update custom exercise
router.put('/custom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, muscleGroup, defaultSets, unitSaved } = req.body;

    const updatedExercise = await CustomExercise.findOneAndUpdate(
      { id },
      { name, muscleGroup, defaultSets, unitSaved },
      { new: true }
    );

    if (!updatedExercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const Routine = require('../models/Routine');
    await Routine.updateMany(
      { 'exercises.id': id },
      { 
        $set: { 
          'exercises.$.name': updatedExercise.name,
          'exercises.$.muscleGroup': updatedExercise.muscleGroup,
          'exercises.$.defaultSets': updatedExercise.defaultSets,
          'exercises.$.unitSaved': updatedExercise.unitSaved
        }
      }
    );

    res.json(updatedExercise);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update custom exercise' });
  }
});

// Delete custom exercise
router.delete('/custom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await CustomExercise.findOneAndDelete({ id });
    
    const Routine = require('../models/Routine');
    await Routine.updateMany(
      {},
      { $pull: { exercises: { id: id } } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete custom exercise' });
  }
});

const searchCache = new Map();

router.get('/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 1) {
    return res.json([]);
  }

  const encodedQuery = encodeURIComponent(query);
  const lowerQuery = query.toLowerCase();
  
  let customMatches = [];
  try {
    const customExercises = await CustomExercise.find();
    customMatches = customExercises.filter(ex => ex.name.toLowerCase().includes(lowerQuery));
  } catch (error) {
    console.error(error);
  }

  // If query is too short for the external API, just return custom matches immediately
  if (query.length < 3) {
    return res.json(customMatches);
  }

  if (searchCache.has(encodedQuery)) {
    return res.json([...customMatches, ...searchCache.get(encodedQuery)]);
  }

  const url = `https://oss.exercisedb.dev/api/v1/exercises?name=${encodedQuery}&limit=15`;

  https.get(url, (apiRes) => {
    let data = '';
    
    apiRes.on('data', (chunk) => {
      data += chunk;
    });
    
    apiRes.on('end', () => {
      try {
        const json = JSON.parse(data);
        let mappedData = [];
        
        if (json.success && json.data) {
          mappedData = json.data.map(ex => ({
            id: ex.exerciseId,
            name: ex.name,
            muscleGroup: ex.bodyParts && ex.bodyParts.length > 0 ? ex.bodyParts[0] : 'Other',
            gifUrl: ex.gifUrl || null,
            equipment: ex.equipments && ex.equipments.length > 0 ? ex.equipments[0] : 'body weight'
          }));
          
          searchCache.set(encodedQuery, mappedData);
        }
        
        res.json([...customMatches, ...mappedData]);
      } catch (err) {
        console.error("Error parsing ExerciseDB response", err);
        res.json(customMatches);
      }
    });
  }).on('error', (err) => {
    console.error("ExerciseDB proxy error:", err);
    res.json(customMatches);
  });
});

module.exports = router;
