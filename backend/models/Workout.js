const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  reps: { type: Number },
  weight: { type: Number },
  type: { type: String, default: 'Working' },
  completedAt: { type: Number, default: null }
}, { _id: false });

const ExerciseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  muscleGroup: { type: String, required: true },
  gifUrl: { type: String, default: null },
  sets: [SetSchema]
}, { _id: false });

const WorkoutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: 0 },
  unitSaved: { type: String, default: 'lbs' },
  exercises: [ExerciseSchema]
});

module.exports = mongoose.model('Workout', WorkoutSchema);
