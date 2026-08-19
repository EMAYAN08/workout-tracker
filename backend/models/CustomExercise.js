const mongoose = require('mongoose');

const CustomExerciseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  muscleGroup: { type: String, required: true },
  gifUrl: { type: String, default: null },
  defaultSets: [{
    reps: { type: Number, default: 0 },
    weight: { type: Number, default: 0 }
  }]
});

module.exports = mongoose.model('CustomExercise', CustomExerciseSchema);
