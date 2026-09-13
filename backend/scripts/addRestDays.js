require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Workout = require('../models/Workout');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const username = 'Admin';
  const now = Date.now();
  const daysToInsert = [3, 6, 9]; // days ago

  for (const daysAgo of daysToInsert) {
    const ts = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const restWorkout = new Workout({
      username,
      id: 'rest-' + Math.random().toString(36).substr(2, 9),
      timestamp: ts,
      endTime: ts.getTime() + 1000,
      duration: 0,
      unitSaved: 'lbs',
      exercises: [],
      routineName: 'Rest Day'
    });

    await restWorkout.save();
    console.log('Inserted Rest Day for ' + username + ' on ' + ts.toISOString());
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(console.error);
