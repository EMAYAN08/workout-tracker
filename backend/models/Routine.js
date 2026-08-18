const mongoose = require('mongoose');

const SetSchema = new mongoose.Schema({
  type: { type: String, default: 'Working' },
  reps: { type: Number },
  weight: { type: Number, default: null }
}, { _id: false });

const ExerciseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  muscleGroup: { type: String, required: true },
  gifUrl: { type: String, default: null },
  sets: [SetSchema]
}, { _id: false });

const RoutineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  exercises: [ExerciseSchema]
});

module.exports = mongoose.model('Routine', RoutineSchema);
