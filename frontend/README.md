# TrackIt — App Store launch checklist

TrackIt is a **local-first iOS/Android workout logger** (Expo SDK 57). There is **no account, no server, and no analytics**. Workouts, routines, and custom exercises live in AsyncStorage on the phone. Users can export/import a JSON backup, get **local** rest-timer notifications, and share a summary image.

This file is the pre-submit checklist so App Review does not bounce the binary. Tick every box before you press **Submit for Review**.

Apple’s rules: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

---

## 0. What reviewers will actually see

If you leave these as they are today, expect a reject or a long delay.

| Current state | Why it matters |
|---|---|
| `app.json` → `ios.infoPlist.UIBackgroundModes: ["audio"]` | TrackIt does **not** play audio. Declaring a background mode you do not use is a classic **2.5.4** reject. **Remove `audio` before the store build.** |
| `ios.supportsTablet: true` | You must ship a usable iPad layout **and** iPad screenshots, or set `supportsTablet` to `false`. |
| `src/components/Auth/Login.jsx` still talks to the old API | Dead login code. Reviewers who install a debug/TestFlight build and search strings, or a leftover screen, will think the app is incomplete. Do not ship Login. |
| `expo-sqlite` is in `app.json` plugins but unused | Storage is AsyncStorage (`src/db/store.js`). Drop the unused plugin so you do not declare a capability you do not use. |
| Settings → **Mock data** | Fine as a toggle. **Must default OFF** in production (`useMock` is already off unless `workout_mock_on=1`). Never submit screenshots that say “Demo data”. |
| Rest timer uses **local** notifications only | Do **not** enable Push Notifications / `remote-notification` background mode. If `expo-notifications` injects them, turn that off in the plugin. |
| Share workout / consistency map uses `react-native-view-shot` + the iOS share sheet | You probably do **not** need full Photo Library access. Prefer the share sheet only; if you save to Camera Roll, use **Add-Only** photo permission copy. |
| Old README mentioned login + Mongo | This file replaces that. Do not link a GitHub README that still describes accounts if App Store Connect points at the repo. |

---

## 1. Binary & project surgery (do this first)

- [ ] Create an **EAS production build** (`eas build --platform ios --profile production`). Expo Go **cannot** be submitted.
- [ ] Confirm the store binary is a **Release** / production profile (no `__DEV__` banners, no Expo Go “development build” warning).
- [ ] Set a real bundle id you own, not a placeholder. Today: `com.trackit.app` — check App Store Connect that it is free, then lock it. Changing it later is painful.
- [ ] Bump `expo.version` (marketing, e.g. `1.0.0`) **and** iOS build number (`ios.buildNumber`) on every upload.
- [ ] **Remove** `UIBackgroundModes: ["audio"]` from [app.json](app.json). Rest complete is a scheduled **local** notification, not an audio session.
- [ ] Configure `expo-notifications` so it does **not** add remote push / `remote-notification`. TrackIt only calls `scheduleNotificationAsync` with a time-interval trigger and a sticky rest banner.
- [ ] Remove unused `expo-sqlite` plugin (and the dependency if nothing imports it).
- [ ] Delete or exclude `src/components/Auth/Login.jsx` from the production bundle. Same for `ConsistencyMap_old.jsx`, Vite leftovers under `src/assets/`, PWA icons under `public/` if they are not used by the native app.
- [ ] Set `ios.supportsTablet` to `false` **unless** you have tested every tab on iPad (Routines, Exercises, Profile charts, Active workout + keypad, Settings backup). If tablet stays true, add iPad screenshots.
- [ ] Add `ITSAppUsesNonExemptEncryption` = `false` (HTTPS not used for app data; no custom crypto). This avoids the annual export-compliance questionnaire loop. Confirm with your lawyer if you later add a backend.
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`): declare **UserDefaults / file timestamp** APIs if Expo’s templates require it. EAS + current Expo usually injects this — open the archive in Xcode and verify before submit.
- [ ] `NSPhotoLibraryUsageDescription` today: *“TrackIt needs access to save workout summary images.”*  
  - If share goes only through `UIActivityViewController` / `expo-sharing`, **remove** photo-library usage so iOS does not show a Photos prompt you never need.  
  - If you save PNGs into Photos, switch to `NSPhotoLibraryAddUsageDescription` (add-only) with a one-sentence, feature-specific string. Never request full library.
- [ ] Notification permission copy (Info.plist / plugin `sounds` + purpose): e.g. *“TrackIt uses notifications to tell you when rest is over.”* Ask **only** when the user starts a rest, which the code already does in `ensureNotificationPermission` — keep it that way. Do not prompt on first launch.
- [ ] Do **not** add Tracking / ATT (`NSUserTrackingUsageDescription`) or HealthKit. TrackIt is not a medical device and does not track users across apps.
- [ ] App icon: 1024×1024 PNG, **no transparency**, **no baked-in rounded corners**, no Expo default. Splash matches [app.json](app.json) (`#070707`).
- [ ] Dark is the default theme. Test Light mode in Settings too — reviewers often flip appearance.

---

## 2. App Review Guidelines mapped to TrackIt

### 2.1 Completeness — the app must look finished

- [ ] Fresh install, mock **off**: empty Routines, empty Exercises (catalog search still works), Profile empty states, History empty. Copy should not look like lorem ipsum.
- [ ] Create a routine → add catalog + custom exercise → start workout → log sets with the keypad → rest timer → finish → summary screen. That path is the reviewer’s first five minutes.
- [ ] Custom keypad: type weight/reps, Next, swipe down to dismiss, does not sit under the tab bar.
- [ ] Rest timer: one timer only; notification “Rest is over” fires when the app is backgrounded (lock screen / Notification Center). If permission is denied, the in-app timer still works.
- [ ] PR overlay: completing a set that beats history shows the gold badge, X to close, auto-dismiss ~5s. Does not block finishing the workout.
- [ ] Cancel workout vs Finish: cancel does not write a session; finish writes to local store and opens summary.
- [ ] Log rest day from Routines (if still in the UI): empty-exercise session named Rest Day, appears on the consistency map as rest, not as a workout.
- [ ] Settings: unit lb/kg conversion on an **active** workout recalculates weights; rest target persists; accent + chart colors apply to buttons **and** graphs/heatmap.
- [ ] Backup: Export writes `trackit-backup-YYYY-MM-DD.json`. Import merge vs replace. Wipe deletes workouts/routines/custom exercises only (theme/units stay).
- [ ] Mock data: toggling ON does not overwrite real data; toggling OFF restores the real local store. Subtitle “Demo data — toggle off in Settings.” must **not** appear in store screenshots.
- [ ] No placeholder “coming soon”, no broken links, no Expo debug menu in the store build.

### 2.3 Metadata — the listing must match the binary

- [ ] Name: **TrackIt** (check App Store uniqueness; you may need “TrackIt Workout Logger”).
- [ ] Subtitle ≤ 30 chars, e.g. `Local workout logger`.
- [ ] Description describes **on-device** storage. Do **not** mention accounts, cloud sync, social feed, Apple Health, or a website backend unless you ship them.
- [ ] Keywords: workout, gym, lifting, routine, logger — no competitor trademark stuffing.
- [ ] Screenshots: real (or mock-toggle) data, **no** status-bar nonsense, no “lorem”, no Android UI on the iOS listing. Include: Routines list, Active workout, Profile (consistency + radar), History, Settings backup.
- [ ] Required sizes: 6.7" (iPhone 15 Pro Max / 16 Pro Max) plus whatever App Store Connect flags. If `supportsTablet` is true, iPad 12.9" too.
- [ ] Preview video optional. If you add one, no fake Health rings, no iOS features you do not implement (Dynamic Island live activities are **not** in the binary unless you added Live Activities — today you did not).
- [ ] Support URL: a real page (even a simple site) with contact email. **Required.**
- [ ] Privacy Policy URL: **Required.** State clearly: no accounts; no data sent to a server; backups are user-exported files; notifications stay on-device; wipe deletes local data. Host it yourself (GitHub Pages is fine).
- [ ] Age rating: typically **4+**. Do not check medical/treatment unless you make health claims (you must not).
- [ ] Category: Health & Fitness. Do not pick Medical.

### 2.5 Software / background / notifications

- [ ] Background modes in the archive = only what you use. Today that should be **none**, unless you later add Live Activities or audio.
- [ ] Local rest notifications must not spam. One “rest live” + one “rest done” per rest. Cancel them on finish/cancel workout (`cancelRestNotification` already exists — verify on device).
- [ ] Notification payloads: exercise name + set label only. No user identity (there is none).
- [ ] App does not crash on first launch without notification permission.

### 4.0 Design / 4.2 Minimum function

- [ ] Sign in is gone — good. Do not show a login wall.
- [ ] The app is a complete logger (routines, live session, history, charts, backup). That meets 4.2 as long as those flows work on a physical iPhone.
- [ ] Do not wrap a mobile website. This is a native Expo app; keep it that way.
- [ ] IPv6 / airplane mode: app must still open and log workouts offline (it should — everything is local). Test with Network Link Conditioner **off the grid**.

### 5.1 Privacy — this is where local-first apps still get rejected

App Store Connect → App Privacy (“nutrition labels”):

- [ ] **Data Not Collected** from you, **or** “Data Not Linked to User” if you later add crash logs. Today: no analytics SDK, no crash reporter, no ads, no sign-in. Set **does not collect data** unless you add Sentry/Firebase.
- [ ] Do **not** check Health, Contact Info, Location, Identifiers, Usage Data unless a library sneaks them in. Audit the binary (Xcode privacy report).
- [ ] Third-party: Expo, Google Fonts (IBM Plex loaded at runtime). If fonts download from Google at launch, that is a network call. Prefer **bundled** font files in the production build so a reviewer on a restricted network still sees type, and so you do not need to declare “product interaction” tracking. Check `@expo-google-fonts/*` — they usually embed the font files. Confirm the store build works in airplane mode **including fonts**.
- [ ] Backup export is **user-initiated**. Do not upload that JSON anywhere.
- [ ] Import accepts TrackIt JSON **and** a Mongo-style dump (`parseBackup` in `src/db/schema.js`). Document that in the privacy policy: files stay on device.
- [ ] Wipe is the “delete my data” control. Mention it in the privacy policy (Settings → Delete all data).
- [ ] No kids category, no user-generated public content, no chat — skip UGC moderation.

### 3.1 Payments / 4.3 spam

- [ ] There is **no IAP and no subscription**. Do not put “Pro”, “Premium unlock”, or a price in screenshots or the description until you implement StoreKit.
- [ ] Do not use “#1”, “best”, or competitor names in the subtitle.

### Health (1.4.1)

- [ ] Do not claim TrackIt diagnoses, treats, or prevents injury/disease.
- [ ] 1RM is an **estimate** (Brzycki). Keep that language (“Est. 1RM”) in the UI and in the listing.
- [ ] Consistency score is a simple % of days trained — not a medical score. Do not call it VO₂ or readiness.

---

## 3. Device QA matrix (do this on a real iPhone)

Reviewers use physical devices. Simulator-only is not enough.

- [ ] iPhone SE-class (small): keypad, radar labels, consistency map, tab bar.
- [ ] iPhone with Dynamic Island / notch: safe areas on Active workout, keypad, summary, Settings.
- [ ] Latest iOS **and** one older iOS that you still support (`expo` / deployment target).
- [ ] Appearance: Dark (default) and Light. Charts, heatmap, PR gold badge, keypad, notifications.
- [ ] Units: log in lb, switch to kg mid-workout, finish, reopen history.
- [ ] Rest: complete a set, lock the phone, wait until rest ends, confirm notification + sound. Deny permission once and confirm in-app timer still runs.
- [ ] Background: start workout, switch to Mail, return — timer still running, sets still there (debounced `workout_active` persist).
- [ ] Kill and relaunch mid-workout: session restores.
- [ ] Import a sample backup, then Wipe, then confirm empty Profile.
- [ ] VoiceOver on the tab bar, New Routine, Complete set, Finish, Wipe. Controls need labels (many already have `accessibilityLabel` — walk the gaps).
- [ ] Dynamic Type: largest text on Profile cards and Settings. Nothing unreadable / clipped.
- [ ] Landscape: you lock portrait (`orientation: portrait`). Confirm it does not rotate, including on iPad if tablet is enabled.

---

## 4. App Store Connect account setup

- [ ] Apple Developer Program membership (paid), two-factor, Agreement accepted.
- [ ] App record: bundle id matches `app.json`.
- [ ] Certificates + provisioning via EAS (`eas credentials`) — distribution cert, App Store profile.
- [ ] Skip Push Notifications capability unless you ship remote push (you should not).
- [ ] Skip Sign in with Apple — there is no login (**4.8** only applies if you offer third-party login).
- [ ] Pricing: Free (or paid up front). If free, no “restore purchase” needed.
- [ ] Age rating questionnaire answered honestly.
- [ ] Export compliance: Non-exempt encryption = No (if you set the Info.plist flag).
- [ ] Content rights: you own the 3D barbell icon, copy, and exercise names in `src/data/catalog.js` (generic lift names are fine; do not use trademarked program names).
- [ ] Demo account: **not required** (no login). In Review Notes write: *“No account. All data is on-device. Optional: Settings → Mock data → On to see a populated log. Please turn it Off before judging empty states.”*
- [ ] Review Notes also explain: rest notifications are local; backup is Files/share sheet; wipe is Settings → Delete all data.
- [ ] Contact email you actually read. Reviewers often email within the 24h window.

---

## 5. Listing copy you should actually use (draft)

**Name:** TrackIt  

**Subtitle:** Workout log on your iPhone  

**Promotional text (optional):** Log sets, rest, and PRs. Everything stays on this phone.

**Description (skeleton):**

> TrackIt is a workout logger that lives entirely on your iPhone. No account. No cloud.
>
> • Build routines and custom exercises  
> • Log weight, reps, and rest with a dedicated keypad  
> • Rest timer with an optional lock-screen alert  
> • Personal-record badge when you hit a new best  
> • History calendar, consistency map, and strength charts  
> • Export / import a backup JSON, or wipe the device clean  
>
> Units in pounds or kilograms. Dark or light. Colors you pick.
>
> Estimated 1-rep max is a formula, not medical advice.

**Review notes (skeleton):**

> Local-first app, no sign-in.  
> To preview charts: Settings → Mock data → On.  
> To test rest notifications: start a routine, complete a set, lock the device.  
> Photo/share: uses the system share sheet for a summary image.  
> We do not use background audio; we do not collect data.

---

## 6. Build & submit commands (when the boxes above are ticked)

```bash
cd frontend
npm test
npx eas login
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

Then in App Store Connect: attach the build, fill Privacy, add screenshots, paste the privacy-policy URL, add Review Notes, **Submit for Review**.

Android Play Store is a separate checklist (Data safety form, 12+ or PEGI, foreground-service if you ever make the rest notification a live service). Do not reuse this iOS list blindly.

---

## 7. Day-of-submit smoke test (30 minutes)

Do this on the **TestFlight** build, not Expo Go.

1. Delete the app, install TestFlight build, launch offline.  
2. Create “Push Day”, add Bench + a custom raise, start, log 3 sets, finish, share summary.  
3. Lock during rest; confirm “Rest is over”.  
4. Hit a PR (first set counts); dismiss the gold badge.  
5. Export backup, wipe, import, confirm history returns.  
6. Toggle Light mode + kg, open Profile charts.  
7. Turn Mock on, then off — real data still there.  
8. Force-quit mid-workout, reopen, finish.

If any step fails, **do not submit**.

---

## 8. After 1.0 (not blockers, but do not advertise them yet)

- iCloud/CloudKit sync (would change privacy labels and require a real privacy update).
- Apple Watch / Live Activities / Dynamic Island — only after a dedicated implementation.
- HealthKit — only with Health review + usage strings + a clear medical disclaimer.
- IAP / “Pro” — StoreKit 2, restore, and guideline 3.1.1.
- Accounts — then Sign in with Apple (4.8) **and** account deletion (5.1.1v).

Until those exist, the listing must not promise them.
