require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Workout = require('../models/Workout');
const Routine = require('../models/Routine');
const CustomExercise = require('../models/CustomExercise');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Create Admin user if doesn't exist
    let admin = await User.findOne({ username: 'Admin' });
    if (!admin) {
      admin = new User({ username: 'Admin', password: 'Admin123' });
      await admin.save();
      console.log('Created Admin user');
    } else {
      console.log('Admin user already exists');
    }

    // Update records without username
    const workoutsRes = await Workout.updateMany({ username: { $exists: false } }, { $set: { username: 'Admin' } });
    console.log('Updated workouts:', workoutsRes.modifiedCount);

    const routinesRes = await Routine.updateMany({ username: { $exists: false } }, { $set: { username: 'Admin' } });
    console.log('Updated routines:', routinesRes.modifiedCount);

    const exercisesRes = await CustomExercise.updateMany({ username: { $exists: false } }, { $set: { username: 'Admin' } });
    console.log('Updated custom exercises:', exercisesRes.modifiedCount);

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
migrate();
