import { getItem, setItem } from '../storage';
import { normalizeWorkout, normalizeRoutine, normalizeCustomExercise } from './schema';

const ASYNC_KEY = 'trackit_local_v1';

function sortWorkouts(list) {
  return [...list].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

class LocalStore {
  constructor() {
    this.workouts = [];
    this.routines = [];
    this.customExercises = [];
    this.ready = false;
    this._timer = null;
    this._writeChain = Promise.resolve();
  }

  /** Test-only: drop in-memory state so suites can share the singleton. */
  async resetForTests() {
    clearTimeout(this._timer);
    this._timer = null;
    this.workouts = [];
    this.routines = [];
    this.customExercises = [];
    this.ready = false;
    this._writeChain = Promise.resolve();
  }

  async init() {
    if (this.ready) return;
    const raw = await getItem(ASYNC_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.workouts = sortWorkouts(parsed.workouts || []);
        this.routines = parsed.routines || [];
        this.customExercises = parsed.customExercises || [];
      } catch {
        /* empty */
      }
    }
    this.ready = true;
  }

  persist() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._writeChain = this._writeChain.then(() => this.flush());
    }, 40);
  }

  async flush() {
    clearTimeout(this._timer);
    await setItem(
      ASYNC_KEY,
      JSON.stringify({
        workouts: this.workouts,
        routines: this.routines,
        customExercises: this.customExercises,
      })
    );
  }

  async upsertWorkout(workout) {
    const row = normalizeWorkout(workout);
    const idx = this.workouts.findIndex((w) => w.id === row.id);
    if (idx >= 0) this.workouts[idx] = row;
    else this.workouts.unshift(row);
    this.workouts = sortWorkouts(this.workouts);
    this.persist();
    return row;
  }

  async deleteWorkout(id) {
    this.workouts = this.workouts.filter((w) => w.id !== id);
    this.persist();
  }

  async upsertRoutine(routine) {
    const row = normalizeRoutine(routine);
    const idx = this.routines.findIndex((r) => r.id === row.id);
    if (idx >= 0) this.routines[idx] = row;
    else this.routines.push(row);
    this.persist();
    return row;
  }

  async deleteRoutine(id) {
    this.routines = this.routines.filter((r) => r.id !== id);
    this.persist();
  }

  async upsertCustomExercise(ex) {
    const row = normalizeCustomExercise(ex);
    const idx = this.customExercises.findIndex((e) => e.id === row.id);
    if (idx >= 0) this.customExercises[idx] = row;
    else this.customExercises.push(row);
    this.persist();
    return row;
  }

  async deleteCustomExercise(id) {
    this.customExercises = this.customExercises.filter((e) => e.id !== id);
    this.routines = this.routines.map((routine) => ({
      ...routine,
      exercises: (routine.exercises || []).filter((ex) => ex.id !== id),
    }));
    this.persist();
  }

  async replaceAll({ workouts, routines, customExercises }) {
    this.workouts = sortWorkouts((workouts || []).map(normalizeWorkout));
    this.routines = (routines || []).map(normalizeRoutine);
    this.customExercises = (customExercises || []).map(normalizeCustomExercise);
    await this.flush();
  }

  async mergeAll({ workouts, routines, customExercises }) {
    for (const w of workouts || []) await this.upsertWorkout(w);
    for (const r of routines || []) await this.upsertRoutine(r);
    for (const e of customExercises || []) await this.upsertCustomExercise(e);
    await this.flush();
  }
}

export const localStore = new LocalStore();
export const resetForTests = () => localStore.resetForTests();
