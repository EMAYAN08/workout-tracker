const fs = require('fs');
const path = require('path');
const https = require('https');

const dbPath = path.join(__dirname, '../data/database.json');

const fetchExercise = (name) => {
  return new Promise((resolve, reject) => {
    // URL encode the name to handle spaces
    const encodedName = encodeURIComponent(name);
    const url = `https://oss.exercisedb.dev/api/v1/exercises?name=${encodedName}&limit=1`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success && json.data && json.data.length > 0) {
            resolve(json.data[0]);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (e) => {
      console.error(e);
      resolve(null);
    });
  });
};

async function migrate() {
  console.log('Starting migration...');
  const dbData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(dbData);
  
  const idMapping = {}; // map local e1, e2 to new exercise objects
  
  console.log('Fetching ExerciseDB counterparts for local exercises...');
  for (const ex of db.exercises) {
    console.log(`Fetching for: ${ex.name}...`);
    const newEx = await fetchExercise(ex.name);
    if (newEx) {
      idMapping[ex.id] = {
        id: newEx.exerciseId,
        name: newEx.name,
        muscleGroup: newEx.bodyParts && newEx.bodyParts.length > 0 ? newEx.bodyParts[0] : ex.muscleGroup,
        gifUrl: newEx.gifUrl || null
      };
      console.log(`  -> Mapped to ${newEx.name} (${newEx.exerciseId})`);
    } else {
      console.log(`  -> No match found. Keeping old ID.`);
      idMapping[ex.id] = ex;
    }
  }
  
  // Replace exercises array
  db.exercises = Object.values(idMapping);
  
  console.log('\nUpdating historical workouts...');
  let updatedWorkouts = 0;
  for (const wk of db.workouts) {
    if (wk.exercises) {
      for (const wkEx of wk.exercises) {
        const mapping = idMapping[wkEx.id];
        if (mapping && mapping.id !== wkEx.id) {
          wkEx.id = mapping.id;
          wkEx.name = mapping.name;
          wkEx.muscleGroup = mapping.muscleGroup;
          wkEx.gifUrl = mapping.gifUrl || null;
          updatedWorkouts++;
        }
      }
    }
  }
  
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log(`\nMigration complete. Updated ${updatedWorkouts} historical exercise entries across ${db.workouts.length} workouts.`);
}

migrate();
