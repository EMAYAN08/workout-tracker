# QA findings — fixed by developer

All items below were reproduced by unit tests, then patched.

| ID | File | Bug | Fix |
|---|---|---|---|
| 1 | `utils/calculations.js` `calculateVolume` | Missing weight/reps produced `NaN` | Coerce with `Number(...) \|\| 0` |
| 2 | `utils/calculations.js` `calculate1RM` | Brzycki denom hits 0 at ~37 reps → negative/huge 1RM | Guard `reps >= 37` / `denom <= 0`; Epley-style fallback |
| 3 | `utils/calculations.js` `getBest1RM` | Empty/invalid sets could yield `-Infinity` | Skip invalid sets; default 0 |
| 4 | `utils/chartRange.js` | Invalid dates threw in date-fns | Skip invalid points |
| 5 | `db/store.js` | No way to reset singleton in tests; delete on missing id was noisy | `resetForTests()`; no-op deletes |
| 6 | `data/catalog.js` `searchCatalog` | Missing `muscleGroup` threw | Optional chaining |
| 7 | `notifications.js` `formatRestClock` | Negative/NaN clocks | Clamp to `0:00` |
| 8 | `context/WorkoutContext.jsx` `getStreaks` | Raw `86400000` broke around DST | `subDays` + `differenceInDays === 1` |

UAT / integration coverage (see `acceptance.test.js`): create routine, custom exercise, save workout, export envelope, import merge/replace, wipe, rest-day empty exercises, mock snapshot shape, unit conversion.
