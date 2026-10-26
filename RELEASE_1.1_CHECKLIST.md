# TrackHit 1.1 — Release Checklist

Version **1.1.0**, TestFlight build **7** (EAS build `2de8049f-296a-48ce-a0eb-3349ff683262`).
1.0 on the App Store was built before commit `2f66d8a`. Everything below landed after that.

---

## 1. What's new in 1.1 (vs 1.0)

### Workout logging
- [x] **Set editor: Add Set button** in the popup (active workout, routine builder, custom exercises) (`41b34e9`)
- [x] **Set editor: Remove Set button** next to Add Set, disabled when only one set is left (`8f5c5a3`)
- [x] **Add Set autofills from the previous set** (weight, reps, type) (`66b71e4`)
- [x] **Auto-finish after 2.5 hours**: a forgotten workout is logged at 2:30:00 and marked auto-finished (`2abaec8`)
- [x] **Cancel workout asks for confirmation** ("Discard workout") (`2abaec8`)
- [x] Tap a routine card to open its editor (`2f66d8a`)
- [x] Plural fixes for routine/day counts; LBS/KGS label matches in routine builder (`59b56c2`)

### Rest timer & notifications
- [x] **Rest-over notification fires only once** (no duplicate when the app reopens) (`2add2e4`)
- [x] **Rest alert follows the exercise you're actually doing**, not list order (`cfc8d7f`)

### Live Activity / Dynamic Island (new, iOS 16.2+; buttons need iOS 17+)
- [x] Workout timer runs live on the Lock Screen and Dynamic Island (`7854e91`)
- [x] Shows routine name, current exercise, set, weight × reps (`df4ac33`, `9c75c4a`)
- [x] Rest timer replaces the workout timer while resting and changes colour when rest is over
- [x] **Interactive Start / Complete set buttons** that sync back to the app (iOS 17+) (`9c75c4a`)

### History & Profile
- [x] **History calendar coloured by routine** + legend, split colours on multi-workout days, tap to view (`2c44d0e`)
- [x] **Avg workout duration = average per logged session** in the selected range (1M/3M/6M/1Y), with session count (`1231ce3`)

### Home Screen widget (new)
- [x] **Consistency widget** in small / medium / large, uses the app theme, updates when you log/edit/delete a workout and at midnight; tap opens TrackHit (`85e3af4`)

### Other
- [x] Settings shows app icon + version at the bottom; UI responsiveness and unit conversion fixes; custom exercise name minimum length; search text overlap fix; smaller floating nav

---

## 2. Before you start the TestFlight QA
- [ ] Build 7 finished processing in App Store Connect → TestFlight
- [ ] Install it **over the App Store 1.0 app** on your main phone (same bundle id, so data stays)
- [ ] Before installing: **Settings → export a backup**, just in case
- [ ] Clean up test data from my web testing if it ever shows up: routine **"AddSet Test"**, exercises **"AddSet Curl"**, **"Dummy Push2"**, **"Test Curl"** (these only existed in the web dev build, but double-check)

## 3. TestFlight QA (on device)

**Upgrade & data**
- [ ] All 1.0 workouts, routines, custom exercises and settings are still there after the upgrade
- [ ] Backup export still works; import of the earlier backup works

**Set editor**
- [ ] Add Set copies the previous set's weight/reps/type (workout, routine builder, custom exercises)
- [ ] Remove Set removes the right set; disabled with only one set left

**Workout lifecycle**
- [ ] Cancel workout → confirm dialog → "Discard workout" discards it; backing out keeps it
- [ ] Auto-finish: start a workout and leave it (or test with the phone clock) → logged at 2:30:00
- [ ] Force-quit the app mid-workout → reopen → workout resumes

**Rest timer**
- [ ] Rest-over notification arrives exactly once (app in background, then reopen: no duplicate)
- [ ] Skip / reorder exercises → the notification names the exercise you're actually on

**Live Activity / Dynamic Island**
- [ ] Appears when a workout starts; timer ticks live on Lock Screen and Dynamic Island (compact + expanded)
- [ ] Shows routine, exercise, set, weight × reps
- [ ] Rest replaces the big timer; colour changes when rest ends
- [ ] Lock-screen **Complete set** button marks the set done in the app (iOS 17+)
- [ ] **Start next set** button works and the app reflects it
- [ ] Ends when the workout finishes/cancels/auto-finishes
- [ ] Known gap: completing a set from the lock screen doesn't show the PR celebration (OK for 1.1)

**Home Screen widget**
- [ ] Open the app once after install, then add the widget (small, medium, large)
- [ ] Map, score, days, streak match the Profile consistency map
- [ ] Log a workout → widget updates
- [ ] Next morning → widget rolled to the new day without opening the app
- [ ] New/empty account shows "No workouts yet"; tapping opens TrackHit
- [ ] Looks right in light and dark mode

**History & Profile**
- [ ] Calendar days coloured by routine; legend correct; tap a day opens it
- [ ] Avg per session matches what you expect for 1M/3M/6M/1Y

## 4. App Store Connect
- [ ] App Store tab → **+ Version** → `1.1.0`
- [ ] **Build** → select 1.1.0 (7)
- [ ] **What's New in This Version** (draft below, edit to taste)
- [ ] Screenshots updated (section 5)
- [ ] App Privacy: no change needed (widget and Live Activity data stay on the device, in the App Group; no new collection). Confirm nothing else changed
- [ ] Review notes: "No login required. Start any routine to see the Live Activity on the Lock Screen / Dynamic Island; Complete/Start buttons need iOS 17. The Consistency widget is in the Home Screen widget gallery under TrackHit."
- [ ] Age rating / export compliance unchanged (answer the encryption question as in 1.0)
- [ ] Release option: **Manually release** or **phased release over 7 days** (recommended for a feature release like this)
- [ ] Submit for Review

**What's New draft**
```
• Live Activity: your workout timer, current set and rest timer on the Lock Screen and Dynamic Island, with buttons to complete a set (iOS 17+)
• New Home Screen widget: your consistency map at a glance
• History calendar is now coloured by routine
• Add and remove sets right from the set editor; new sets copy the previous one
• Average workout duration is now per session
• Workouts left running finish automatically after 2.5 hours
• Rest alerts follow the exercise you're on and arrive only once
• Bug fixes and polish
```

## 5. Screenshots: yes, retake some
Apple's current rule (App Store Connect screenshot specs, checked Oct 2026): the **required** iPhone set is now
**"iPhone with Dynamic Island (medium display)", i.e. 6.3": 1206 × 2622 or 1179 × 2556** (iPhone 17/17 Pro/16 Pro/15 Pro).
6.9" (1320 × 2868 / 1290 × 2796) is now optional but still accepted. The 1.0 set was 6.5". Easiest: take the new shots on an iPhone 15 Pro/16 Pro/17 or 17 Pro, plus 6.9" ones if you have a Pro Max.
iPad: only if the app supports iPad (13" 2064 × 2752).

Shots to take (up to 10 per size, PNG/JPEG, no transparency):
- [ ] 1. **Lock Screen with the Live Activity** during a set (routine, exercise, weight × reps, timer)
- [ ] 2. **Dynamic Island expanded** (long-press) during rest, showing the rest timer
- [ ] 3. **Home Screen with the Consistency widget** (medium or large, with a real map)
- [ ] 4. **History calendar with routine colours + legend**
- [ ] 5. **Set editor popup** showing Add Set / Remove Set
- [ ] 6. **Profile** with consistency map + "Avg per session"
- [ ] 7–10. Keep the best 1.0 shots (active workout, routines, exercises) if they still match the current UI
- [ ] Optional: a 15–30s **App Preview** video (start workout → Live Activity → complete set from lock screen → widget)

## 6. After release
- [ ] Tag the release: `git tag v1.1.0 <commit> && git push --tags`
- [ ] Update the site/README screenshots if you like
- [ ] Watch crash reports in App Store Connect / TestFlight for the first few days
