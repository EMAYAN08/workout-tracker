const express = require('express');
const router = express.Router();
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../data/database.json');
const getDb = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const saveDb = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

const searchCache = new Map();

// Get all custom exercises
router.get('/custom', (req, res) => {
  const db = getDb();
  res.json(db.customExercises || []);
});

// Create a custom exercise
router.post('/custom', (req, res) => {
  const { name, muscleGroup } = req.body;
  if (!name || !muscleGroup) {
    return res.status(400).json({ error: "Missing name or muscle group" });
  }

  const db = getDb();
  if (!db.customExercises) {
    db.customExercises = [];
  }

  const newExercise = {
    id: 'c_' + crypto.randomBytes(4).toString('hex'),
    name: name.toLowerCase(),
    muscleGroup,
    isCustom: true,
    gifUrl: null,
    equipment: 'other'
  };

  db.customExercises.push(newExercise);
  saveDb(db);

  // Invalidate search cache so new custom exercises appear immediately
  searchCache.clear();

  res.status(201).json(newExercise);
});

// Search exercises (Proxy to ExerciseDB + Custom)
router.get('/search', (req, res) => {
  const query = req.query.q;
  if (!query || query.length < 3) {
    return res.json([]);
  }

  const encodedQuery = encodeURIComponent(query);
  const lowerQuery = query.toLowerCase();
  
  // Get custom exercises matching query
  const db = getDb();
  const customMatches = (db.customExercises || []).filter(ex => ex.name.includes(lowerQuery));

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
        // If API fails, at least return custom matches
        res.json(customMatches);
      }
    });
  }).on('error', (err) => {
    console.error("ExerciseDB proxy error:", err);
    res.json(customMatches);
  });
});

module.exports = router;
