const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/database.json');
const dbRaw = fs.readFileSync(dbPath, 'utf8');
const db = JSON.parse(dbRaw);

const now = Date.now();
const msInDay = 24 * 60 * 60 * 1000;

// Grab first 5 exercises from DB
const availableExercises = db.exercises.slice(0, 5);

// Add custom exercises if not exists
if (!db.customExercises) {
  db.customExercises = [];
}
if (db.customExercises.length === 0) {
  db.customExercises.push(
    { id: 'c1', name: 'Hex Bar Deadlift', muscleGroup: 'legs' },
    { id: 'c2', name: 'Z-Press', muscleGroup: 'shoulders' }
  );
}
const availableCustom = db.customExercises;

// Clear existing workouts except the first one (just in case)
db.workouts = [];

// Generate dummy workouts over the past 180 days
// Random chance to have a workout on any given day (e.g. 60% chance)
for (let i = 180; i >= 0; i--) {
  if (Math.random() < 0.6) { // 60% consistency
    const workoutTime = new Date(now - i * msInDay);
    // Maybe do 2 workouts on some rare days
    const numWorkouts = Math.random() < 0.05 ? 2 : 1;
    
    for (let w = 0; w < numWorkouts; w++) {
      const workout = {
        id: `wk_seed_${i}_${w}`,
        timestamp: workoutTime.toISOString(),
        endTime: new Date(workoutTime.getTime() + 60 * 60 * 1000).toISOString(),
        duration: 3600,
        unitSaved: 'lbs',
        exercises: []
      };

      // 1 to 4 exercises per workout
      const numEx = Math.floor(Math.random() * 4) + 1;
      const shuffledEx = [...availableExercises, ...availableCustom].sort(() => 0.5 - Math.random());
      const selectedEx = shuffledEx.slice(0, numEx);

      selectedEx.forEach(ex => {
        const numSets = Math.floor(Math.random() * 3) + 3; // 3 to 5 sets
        const sets = [];
        let baseWeight = Math.floor(Math.random() * 100) + 50; // 50 to 150 lbs
        
        for (let s = 0; s < numSets; s++) {
          sets.push({
            reps: Math.floor(Math.random() * 6) + 6, // 6 to 11 reps
            weight: baseWeight,
            type: s === 0 ? "Warmup" : (s === numSets - 1 ? "Failure" : "Working")
          });
          if (s > 0) baseWeight += 5; // progressive overload
        }

        workout.exercises.push({
          id: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          gifUrl: ex.gifUrl || null,
          sets
        });
      });

      db.workouts.push(workout);
    }
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Seeded ${db.workouts.length} workouts!`);
