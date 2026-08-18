require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const CustomExercise = require('../models/CustomExercise');
const Workout = require('../models/Workout');
const Routine = require('../models/Routine');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please set MONGODB_URI in your .env file');
  process.exit(1);
}

const dataPath = path.join(__dirname, '../data/database.json');

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    if (!fs.existsSync(dataPath)) {
      console.log('No local database.json found. Nothing to migrate.');
      process.exit(0);
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);

    // Migrate Custom Exercises
    if (data.exercises && data.exercises.length > 0) {
      console.log(`Migrating ${data.exercises.length} custom exercises...`);
      for (const ex of data.exercises) {
        await CustomExercise.findOneAndUpdate(
          { id: ex.id },
          { $set: ex },
          { upsert: true, new: true }
        );
      }
    }

    // Migrate Routines
    if (data.routines && data.routines.length > 0) {
      console.log(`Migrating ${data.routines.length} routines...`);
      for (const rt of data.routines) {
        await Routine.findOneAndUpdate(
          { id: rt.id },
          { $set: rt },
          { upsert: true, new: true }
        );
      }
    }

    // Migrate Workouts
    if (data.workouts && data.workouts.length > 0) {
      console.log(`Migrating ${data.workouts.length} workouts...`);
      for (const wk of data.workouts) {
        await Workout.findOneAndUpdate(
          { id: wk.id },
          { $set: wk },
          { upsert: true, new: true }
        );
      }
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
