# TrackHit — App Store launch checklist

**Submit walkthrough (dropdowns + steps):** [app-store-checklist.md](app-store-checklist.md)

TrackHit is a **local-first iOS/Android workout logger** (Expo SDK 57). There is **no account, no server, and no analytics**. Workouts, routines, and custom exercises live in AsyncStorage on the phone. Users can export/import a JSON backup, get **local** rest-timer notifications, and share a summary image.

Tick a box when that item is done. `[x]` is already true in the repo. `[ ]` is still on you (Xcode, App Store Connect, or a physical iPhone). Checking a box on GitHub writes a commit — that is the intended workflow.

Apple’s rules: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

---

## Repo surgery already applied (do not re-do)

- [x] Removed `UIBackgroundModes: ["audio"]` — rest is a local notification, not an audio session.
- [x] Set `ios.supportsTablet: false` — first ship is iPhone-only (no iPad screenshots).
- [x] Removed `NSPhotoLibraryUsageDescription` — share uses the system share sheet, not Photos.
- [x] Removed `expo-sqlite` plugin + dependency — storage is AsyncStorage (`src/db/store.js`).
- [x] Deleted `src/components/Auth/Login.jsx` + `src/config.js` — dead API login is gone.
- [x] Deleted `ConsistencyMap_old.jsx` + unused Vite assets.
- [x] Bundled `VioletSans-Regular.ttf` via `expo-font` (no Google Fonts at runtime).
- [x] Set `ITSAppUsesNonExemptEncryption` / `usesNonExemptEncryption` = **false**.
- [x] Added `ios.privacyManifests` for UserDefaults (`CA92.1`) and file timestamps (`C617.1`).
- [x] `expo-notifications` plugin sets `enableBackgroundRemoteNotifications: false`.
- [x] Added production profile in [eas.json](eas.json).
- [x] App icon `assets/icon.png` is **1024×1024 RGB, no alpha**. Splash is opaque `#070707`. Notification glyph is RGBA (Android small-icon; iOS uses the app icon).

---

## 0. What reviewers will still flag if you skip it

- [ ] Production IPA — Expo Go / a dev client **cannot** be submitted. Run `eas build --platform ios --profile production`.
- [ ] Bundle id `com.trackit.app` — confirm you own it in App Store Connect and lock it.
- [x] Support URL — **hard required** in App Store Connect: https://emayan08.github.io/workout-tracker/support/
- [x] Privacy Policy URL — **hard required** in App Store Connect: https://emayan08.github.io/workout-tracker/privacy/
- [ ] Screenshots — 2026 required set is **6.9" iPhone, 1320×2868**. Do not screenshot Mock-on “Demo data”.
- [ ] Device QA on a physical iPhone (reviewers do not use your simulator).
- [ ] Privacy nutrition labels — declare **Data Not Collected**. Audit the archive’s privacy report.
- [ ] EU DSA trader contact — required to distribute in the EU.
- [ ] Accessibility Nutrition Labels — optional today, expected soon.

---

## 1. Binary & project

- [x] Remove `UIBackgroundModes: ["audio"]` from [app.json](app.json).
- [x] Configure `expo-notifications` with `enableBackgroundRemoteNotifications: false`. TrackHit only uses `scheduleNotificationAsync` (time-interval + sticky rest banner).
- [x] Remove unused `expo-sqlite` plugin and dependency.
- [x] Delete dead `Login.jsx` / `config.js` / `ConsistencyMap_old.jsx` / unused Vite assets.
- [x] `ios.supportsTablet` is **false** (iPhone-only). Revisit only if you later test every tab on iPad and add 13" iPad screenshots (2064×2752).
- [x] `ITSAppUsesNonExemptEncryption` = `false`. Confirm with a lawyer if you later add a backend.
- [x] Privacy manifest in `app.json` for UserDefaults + file timestamps.
- [ ] Open the archive in Xcode and confirm Expo injected the same privacy manifest.
- [x] No Photo Library usage string. Share is share-sheet only. Do not add `NSPhotoLibraryAddUsageDescription` unless you later save into Camera Roll.
- [x] Notification permission is requested **only when rest starts** (`ensureNotificationPermission`). Do not prompt on first launch.
- [x] No Tracking / ATT (`NSUserTrackingUsageDescription`) and no HealthKit.
- [x] App icon: 1024×1024 PNG, no transparency, no baked-in rounded corners, not the Expo default. Splash `#070707`.
- [x] Dark is the default theme; Light exists in Settings.
- [ ] Test Dark **and** Light on a physical device.
- [x] Violet Sans is bundled (no Google Fonts network call).
- [x] Mock data defaults **OFF** (`useMock` only when `workout_mock_on=1`).
- [x] Portrait locked (`orientation: portrait`).
- [x] Marketing version `1.0.0` and iOS `buildNumber` `1` in [app.json](app.json).
- [ ] Bump `buildNumber` on every App Store upload.
- [ ] Create an **EAS production build** (`npx eas build --platform ios --profile production`). Expo Go cannot be submitted.
- [ ] Confirm the store binary is **Release** (no `__DEV__` banners, no “development build” warning).
- [ ] Confirm you own bundle id `com.trackit.app` in the Apple Developer portal / App Store Connect.
- [ ] In the built archive, confirm **no** Push Notifications entitlement and **no** `remote-notification` background mode.
- [ ] In the built archive, confirm **no** Photos permission appears in Settings → TrackHit.

---

## 2. App Review Guidelines mapped to TrackHit

### 2.1 Completeness — the app must look finished

- [x] Sign-in is gone. No login wall.
- [x] Mock defaults off so a fresh install is empty.
- [ ] Fresh-install empty states (Routines, Exercises catalog, Profile, History) look finished — no lorem. Walk this on TestFlight.
- [ ] Create a routine → add catalog + custom exercise → start workout → log sets with the keypad → rest timer → finish → summary. Reviewer’s first five minutes.
- [ ] Custom keypad: type weight/reps, Next, swipe down to dismiss, does not sit under the tab bar.
- [ ] Rest timer: one timer only; “Rest is over” fires when backgrounded. If permission is denied, the in-app timer still works.
- [ ] PR overlay: gold badge, X to close, auto-dismiss ~5s, does not block Finish. Light **and** dark.
- [ ] Cancel does not write a session; Finish writes locally and opens summary.
- [x] Rest-day sessions (empty exercises) still exist in data; they show as rest on the map, not as a workout. There is no giant “Log rest day” button on the active workout screen.
- [ ] Settings: lb/kg on an **active** workout recalculates weights; rest target persists; accent + chart colors apply to buttons **and** graphs/heatmap.
- [ ] Backup: Export `trackhit-backup-YYYY-MM-DD.json`. Import merge vs replace. Wipe deletes workouts/routines/custom exercises only (theme/units stay).
- [ ] Mock ON does not overwrite real data; OFF restores it. Subtitle “Demo data — toggle off in Settings.” must **not** appear in store screenshots.
- [ ] No “coming soon”, no broken links, no Expo debug menu in the store build.

### 2.3 Metadata — listing must match the binary

- [ ] Name uniqueness: **TrackHit** (30-char cap). You may need “TrackHit Workout Logger”.
- [ ] Subtitle ≤ 30 chars, e.g. `Local workout logger`.
- [ ] Description is **on-device** only. Do **not** mention accounts, cloud sync, social feed, Apple Health, Dynamic Island Live Activities, or a website backend.
- [ ] Keywords: workout, gym, lifting, routine, logger — no competitor trademarks.
- [ ] Screenshots show the app **in use** (guideline **2.3.3**), not splash/title art. Include: Routines, Active workout, Profile (consistency + radar), History, Settings backup.
- [ ] **Required 2026 size:** 6.9" iPhone **1320×2868** (iPhone 16 Pro Max / 17 Pro Max class). Upload 3–10. Apple scales down. Older 1290×2796 is legacy.
- [ ] Because `supportsTablet` is false, **do not** upload iPad screenshots and **turn off** “Apple Silicon Mac” / iPad availability in App Store Connect.
- [ ] No Android chrome, no “Demo data” banner, no status-bar overlays that look fake.
- [ ] Preview video optional. If you add one: no fake Health rings, no Live Activities you did not ship.
- [ ] Support URL: a real page with a contact email. **Required.**
- [ ] Privacy Policy URL: **Required.** State: no accounts; no data sent to a server; backups are user-exported files; notifications stay on-device; wipe is Settings → Delete all data; import may accept a Mongo-style dump and it stays on device.
- [ ] Age rating typically **4+**. Do not check medical/treatment. Do not make health claims.
- [ ] Category: Health & Fitness. Not Medical.
- [ ] Copyright year (e.g. `2026 Emayan Vadivel`) on App Information.
- [ ] What’s New for 1.0 can be the first-launch description, not a fake changelog.

### 2.5 Software / background / notifications

- [x] Intended background modes: **none**. Rest complete is a scheduled local notification.
- [ ] Verify the **archive** has no background modes and no `aps-environment` / push entitlement.
- [ ] Local rest notifications do not spam. One live rest + one rest-done per rest. Cancelled on finish/cancel (`cancelRestNotification`). Verify on device.
- [x] Notification copy is exercise name + set / clock only. No identity (there is none).
- [ ] App does not crash on first launch without notification permission.

### 4.0 Design / 4.2 Minimum function

- [x] No login wall.
- [x] Complete logger in code (routines, live session, history, charts, backup).
- [x] Native Expo app, not a wrapped website.
- [ ] Airplane mode / IPv6: app opens and logs offline. Test with Network Link Conditioner **off the grid**, including fonts (bundled — should pass).

### 5.1 Privacy

App Store Connect → App Privacy:

- [ ] Set **Data Not Collected**. No analytics SDK, no crash reporter, no ads, no sign-in. If you later add Sentry/Firebase you must update this **before** that binary ships.
- [ ] Do **not** check Health, Contact Info, Location, Identifiers, Usage Data unless the Xcode privacy report shows a library sneaking them in. **Audit the binary.**
- [x] Fonts are bundled. No Google Fonts fetch at launch.
- [x] Backup export is user-initiated and never uploaded.
- [x] Wipe is the “delete my data” control (Settings → Delete all data). Mention it in the privacy policy.
- [x] No kids category, no public UGC, no chat.
- [ ] Privacy policy hosted and URL pasted in App Store Connect.

### 3.1 Payments / 4.3 spam

- [x] No IAP and no subscription. Do not put “Pro”, “Premium unlock”, or a price in screenshots or the description until StoreKit exists.
- [ ] Do not use “#1”, “best”, or competitor names in the subtitle.

### Health (1.4.1)

- [x] UI says **Est. 1RM** (Brzycki estimate), not a medical 1RM.
- [ ] Listing copy must not claim TrackHit diagnoses, treats, or prevents injury/disease.
- [x] Consistency score is a % of days trained — not VO₂ or readiness. Keep it that way in the listing.

### 2.3.1 hidden features / 2.5.2

- [x] Mock data is a **Settings toggle**, not a hidden debug menu. Mention it in Review Notes so it is documented.
- [ ] Do not ship `__DEV__`-only screens in the production profile.

---

## 3. Device QA matrix (real iPhone, TestFlight)

- [ ] iPhone SE-class (small): keypad, radar labels, consistency map, tab bar.
- [ ] Dynamic Island / notch: safe areas on Active workout, keypad, summary, Settings.
- [ ] Latest iOS **and** the oldest iOS you still support (Expo / deployment target).
- [ ] Dark (default) and Light. Charts, heatmap, PR badge, keypad, notifications.
- [ ] Units: log in lb, switch to kg mid-workout, finish, reopen history.
- [ ] Rest: complete a set, lock the phone, wait until rest ends, confirm notification + sound. Deny permission once; in-app timer still runs.
- [ ] Background: start workout, switch to Mail, return — timer still running, sets still there.
- [ ] Kill and relaunch mid-workout: session restores.
- [ ] Import a sample backup, Wipe, confirm empty Profile.
- [ ] VoiceOver: tab bar, New Routine, Complete set, Finish, Wipe. Fill gaps in `accessibilityLabel`.
- [ ] Dynamic Type (largest): Profile cards and Settings. Nothing clipped.
- [ ] Confirm portrait lock (including Control Center rotation).
- [ ] Tab re-tap scrolls to top; graph pointers clear when leaving Profile.

---

## 4. App Store Connect account setup

- [ ] Apple Developer Program membership (paid), two-factor, agreements accepted.
- [ ] App record: bundle id matches `com.trackit.app`.
- [ ] Certificates + provisioning via EAS (`eas credentials`) — distribution cert, App Store profile.
- [x] **Skip** Push Notifications capability.
- [x] **Skip** Sign in with Apple. Guideline **4.8** only applies if the app offers a *third-party* login (Google, Facebook, etc.). TrackHit has **no accounts at all**, so SIWA is not required and Apple will **not** reject you for omitting it. Do **not** add Google/Apple login “just in case” — that would *create* a 4.8 obligation.
- [ ] **Skip** HealthKit, Game Center, Associated Domains, App Clips, Widgets. (Tick once you have confirmed none of these are on the app record.)
- [ ] Pricing: Free (or paid up front). If free, no Restore Purchase needed.
- [ ] Age rating questionnaire answered honestly (4+).
- [ ] Export compliance: Non-exempt encryption = No (Info.plist flag is set).
- [ ] Content rights: you own the barbell icon, copy, and generic lift names in `src/data/catalog.js`. No trademarked program names.
- [ ] Demo account: **not required**. Review Notes: *“No account. All data is on-device. Optional: Settings → Mock data → On to see a populated log. Please turn it Off before judging empty states.”*
- [ ] Review Notes also: rest notifications are local; backup is Files/share sheet; wipe is Settings → Delete all data; we do not use background audio; we do not collect data.
- [ ] Contact email you actually read (24h reviewer window).
- [ ] Availability: **iPhone only**. Turn **off** iPad, Apple Silicon Mac, visionOS, Apple Watch, iMessage.
- [ ] Primary language + at least US storefront. Add others only if copy is localized (it is not — English only).

---

## 5. New / easy-to-miss 2025–2026 Connect fields

- [ ] **iPhone 6.9" screenshots (1320×2868)** — currently the required iPhone set. Skipping blocks submit.
- [ ] **EU Digital Services Act (DSA) trader status** — App Information → App Store Regulations. If you distribute in the EU you must declare trader vs non-trader and (if trader) publish a phone + email on the product page. [Apple’s DSA help](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-compliance-information/).
- [ ] **Accessibility Nutrition Labels** (WWDC25, on product pages from iOS 26). Voluntary now, required later. Evaluate: VoiceOver, Voice Control, Larger Text, Sufficient Contrast, Differentiate Without Color, Reduced Motion, Dark Interface. Add an accessibility URL if you have one. [Apple’s overview](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/). Honest answers only — do not claim VoiceOver if you have not walked every primary task.
- [ ] **Social media questionnaire** (mandatory for new submissions as of Sep 2026). TrackHit is **not** a social app: no public feeds, DMs, or UGC. Answer **No** to social-media capabilities so you are not pulled into the higher age / Screen Time buckets.
- [ ] **App Encryption Documentation** — already flagged in Info.plist; still tap through the Connect questionnaire once.
- [ ] **Content rights / advertising ID** — TrackHit does not use IDFA. Do not add `NSUserTrackingUsageDescription` “just in case”.
- [ ] **China ICP / additional permits** — only if you enable the China mainland storefront. Default: leave China off unless you have the filings.
- [ ] **Standard EULA** is fine. Do not attach a custom EULA unless legal writes one.
- [ ] **Family Sharing** — N/A (no IAP). Leave default.
- [ ] **In-App Events / custom product pages** — skip for 1.0.
- [ ] **Third-party SDK signatures / privacy manifests** — Expo modules should ship theirs; confirm in the Xcode privacy report after the first EAS archive.

---

## 6. Listing copy (paste into App Store Connect)

Tick each line after you paste it in Connect.

- [ ] **Name:** TrackHit
- [ ] **Subtitle:** Private workout log
- [ ] **Promotional text:** Your sets, rest, and PRs — saved only on this iPhone.
- [ ] **Description** pasted (text below).
- [ ] **Keywords** pasted: `workout,gym,lifting,logger,routine,sets,reps,strength,fitness,training`
- [ ] **Review notes** pasted (text below).

**Description:**

> TrackHit is a workout logger that lives on your iPhone. No account. No cloud. Your training never leaves this device.
>
> Build routines and custom exercises, then log every set with a dedicated number pad. Rest between sets with an optional lock-screen timer. Hit a personal record and you’ll see it.
>
> History, a consistency map, and strength charts show how you actually trained — by month, quarter, or year.
>
> Switch phones with an export. Start over anytime. Pounds or kilograms. Dark or light. A color you choose.
>
> Estimated 1-rep max is a formula, not medical advice.

**Review notes:**

> No sign-in. All data is on-device.
> To preview charts: Settings → Mock data → On. Please turn it Off before judging empty states.
> Rest notifications: start a routine, complete a set, lock the device. Local only — no push.
> Share uses the system share sheet. We do not request Photos access.
> No background audio, no tracking, no data collection. iPhone only.

---

## 7. Build & submit

Do this only after the remaining boxes above are ticked.

- [ ] `cd frontend && npm test` — tests pass.
- [ ] `npx eas login`
- [ ] `npx eas build --platform ios --profile production`
- [ ] `npx eas submit --platform ios`
- [ ] Attach the build in App Store Connect.
- [ ] Fill Privacy, DSA, accessibility labels, social-media questions.
- [ ] Upload 6.9" screenshots.
- [ ] Paste privacy-policy URL + support URL.
- [ ] Paste Review Notes.
- [ ] **Submit for Review.**

Android Play Store is a separate checklist (Data safety form, 12+ / PEGI, notification permission). Do not reuse this iOS list blindly.

---

## 8. Day-of-submit smoke test (30 minutes)

Do this on the **TestFlight** build, not Expo Go.

- [ ] Delete the app, install TestFlight, launch **offline**.
- [ ] Create “Push Day”, add Bench + a custom raise, start, log 3 sets, finish, share summary.
- [ ] Lock during rest; confirm “Rest is over”.
- [ ] Hit a PR (first set counts); dismiss the gold badge.
- [ ] Export backup, wipe, import, confirm history returns.
- [ ] Toggle Light mode + kg, open Profile charts. Pointers clear if you leave the tab.
- [ ] Turn Mock on, then off — real data still there.
- [ ] Force-quit mid-workout, reopen, finish.
- [ ] Confirm Settings → TrackHit shows **no** Photos / Tracking / Background App Refresh you did not intend.

If any step fails, **do not submit**.

---

## 9. After 1.0 (not blockers — do not advertise them)

- [ ] iCloud / CloudKit sync (changes privacy labels).
- [ ] Apple Watch / Live Activities / Dynamic Island — only after a dedicated implementation.
- [ ] HealthKit — Health review + usage strings + medical disclaimer.
- [ ] IAP / “Pro” — StoreKit 2, restore, guideline 3.1.1.
- [ ] Accounts — then Sign in with Apple (4.8) **and** account deletion (5.1.1v).
- [ ] iPad / Mac — turn `supportsTablet` back on only after a real iPad pass + 13" screenshots.

Until those exist, the listing must not promise them.
