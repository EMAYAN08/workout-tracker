# TrackIt — App Store launch checklist

TrackIt is a **local-first iOS/Android workout logger** (Expo SDK 57). There is **no account, no server, and no analytics**. Workouts, routines, and custom exercises live in AsyncStorage on the phone. Users can export/import a JSON backup, get **local** rest-timer notifications, and share a summary image.

This file is the pre-submit checklist so App Review does not bounce the binary. `[x]` = already true in the repo. `[ ]` = you still have to do it in Xcode, App Store Connect, or on a physical iPhone.

Apple’s rules: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

---

## Repo surgery already applied (do not re-do)

These used to be reject magnets. They are fixed in `app.json` / the source tree:

| Was | Now |
|---|---|
| `UIBackgroundModes: ["audio"]` | **Removed.** Rest is a local notification, not an audio session. |
| `ios.supportsTablet: true` | **`false`.** First ship is iPhone-only (no iPad screenshots required). |
| `NSPhotoLibraryUsageDescription` | **Removed.** Share uses the system share sheet (`expo-sharing` + `UIActivityViewController`), not Photos. |
| `expo-sqlite` plugin + dependency | **Removed.** Storage is AsyncStorage (`src/db/store.js`). |
| `src/components/Auth/Login.jsx` + `src/config.js` | **Deleted.** Dead API login is gone. |
| `ConsistencyMap_old.jsx` + unused Vite assets | **Deleted.** |
| Fonts from Google at runtime | **Bundled** `VioletSans-Regular.ttf` via `expo-font`. Airplane mode still has type. |
| No export-compliance flag | `ITSAppUsesNonExemptEncryption` / `usesNonExemptEncryption` = **false**. |
| No privacy manifest | `ios.privacyManifests` declares UserDefaults (`CA92.1`) and file timestamps (`C617.1`). |
| `expo-notifications` might inject push | Plugin sets `enableBackgroundRemoteNotifications: false`. |
| No EAS config | [eas.json](eas.json) production profile added. |

**Icon check:** `assets/icon.png` is **1024×1024 RGB, no alpha**. Splash is opaque `#070707`. Notification glyph is RGBA (correct for Android small-icon; iOS uses the app icon).

---

## 0. What reviewers will still flag if you skip it

| Still on you | Why it matters |
|---|---|
| No production IPA yet | Expo Go / a dev client **cannot** be submitted. Need `eas build --platform ios --profile production`. |
| Bundle id `com.trackit.app` | Confirm you own it in App Store Connect and lock it. Changing later is painful. |
| No Support URL / Privacy Policy URL | **Hard required** in App Store Connect. |
| Screenshots | 2026 required set is **6.9" iPhone, 1320×2868**. Do not screenshot Mock-on “Demo data”. |
| Device QA | Reviewers use physical iPhones. Simulator-only is not enough. |
| Privacy nutrition labels | Declare **Data Not Collected**. Audit the archive’s privacy report. |
| EU DSA trader contact | Required to distribute in the EU. |
| Accessibility Nutrition Labels | Optional today, expected soon — fill them in. |

---

## 1. Binary & project

- [x] Remove `UIBackgroundModes: ["audio"]` from [app.json](app.json).
- [x] Configure `expo-notifications` with `enableBackgroundRemoteNotifications: false`. TrackIt only uses `scheduleNotificationAsync` (time-interval + sticky rest banner).
- [x] Remove unused `expo-sqlite` plugin and dependency.
- [x] Delete dead `Login.jsx` / `config.js` / `ConsistencyMap_old.jsx` / unused Vite assets.
- [x] `ios.supportsTablet` is **false** (iPhone-only). Revisit only if you later test every tab on iPad and add 13" iPad screenshots (2064×2752).
- [x] `ITSAppUsesNonExemptEncryption` = `false`. Confirm with a lawyer if you later add a backend.
- [x] Privacy manifest in `app.json` for UserDefaults + file timestamps. Still **open the archive in Xcode** and confirm Expo injected the same.
- [x] No Photo Library usage string. Share is share-sheet only. Do not add `NSPhotoLibraryAddUsageDescription` unless you later save into Camera Roll.
- [x] Notification permission is requested **only when rest starts** (`ensureNotificationPermission`). Do not prompt on first launch.
- [x] No Tracking / ATT (`NSUserTrackingUsageDescription`) and no HealthKit.
- [x] App icon: 1024×1024 PNG, no transparency, no baked-in rounded corners, not the Expo default. Splash `#070707`.
- [x] Dark is the default theme; Light exists in Settings. **Still test both on device.**
- [x] Violet Sans is bundled (no Google Fonts network call).
- [x] Mock data defaults **OFF** (`useMock` only when `workout_mock_on=1`).
- [x] Portrait locked (`orientation: portrait`).
- [x] Marketing version `1.0.0` and iOS `buildNumber` `1` in [app.json](app.json). **Bump build number on every upload.**
- [ ] Create an **EAS production build** (`npx eas build --platform ios --profile production`). Expo Go cannot be submitted.
- [ ] Confirm the store binary is **Release** (no `__DEV__` banners, no “development build” warning).
- [ ] Confirm you own bundle id `com.trackit.app` in the Apple Developer portal / App Store Connect.
- [ ] In the built archive, confirm **no** Push Notifications entitlement and **no** `remote-notification` background mode.
- [ ] In the built archive, confirm **no** Photos permission appears in Settings → TrackIt.

---

## 2. App Review Guidelines mapped to TrackIt

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
- [ ] Backup: Export `trackit-backup-YYYY-MM-DD.json`. Import merge vs replace. Wipe deletes workouts/routines/custom exercises only (theme/units stay).
- [ ] Mock ON does not overwrite real data; OFF restores it. Subtitle “Demo data — toggle off in Settings.” must **not** appear in store screenshots.
- [ ] No “coming soon”, no broken links, no Expo debug menu in the store build.

### 2.3 Metadata — listing must match the binary

- [ ] Name uniqueness: **TrackIt** (30-char cap). You may need “TrackIt Workout Logger”.
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
- [ ] Listing copy must not claim TrackIt diagnoses, treats, or prevents injury/disease.
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
- [ ] **Skip** Push Notifications capability.
- [ ] **Skip** Sign in with Apple (4.8 only applies if you offer third-party login).
- [ ] **Skip** HealthKit, Game Center, Associated Domains, App Clips, Widgets.
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

Fill these even though they are not all “code”:

- [ ] **iPhone 6.9" screenshots (1320×2868)** — currently the required iPhone set. Skipping blocks submit.
- [ ] **EU Digital Services Act (DSA) trader status** — App Information → App Store Regulations. If you distribute in the EU you must declare trader vs non-trader and (if trader) publish a phone + email on the product page. [Apple’s DSA help](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-compliance-information/).
- [ ] **Accessibility Nutrition Labels** (WWDC25, on product pages from iOS 26). Voluntary now, required later. Evaluate: VoiceOver, Voice Control, Larger Text, Sufficient Contrast, Differentiate Without Color, Reduced Motion, Dark Interface. Add an accessibility URL if you have one. [Apple’s overview](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/). Honest answers only — do not claim VoiceOver if you have not walked every primary task.
- [ ] **Social media questionnaire** (mandatory for new submissions as of Sep 2026). TrackIt is **not** a social app: no public feeds, DMs, or UGC. Answer **No** to social-media capabilities so you are not pulled into the higher age / Screen Time buckets.
- [ ] **App Encryption Documentation** — already flagged in Info.plist; still tap through the Connect questionnaire once.
- [ ] **Content rights / advertising ID** — TrackIt does not use IDFA. Do not add `NSUserTrackingUsageDescription` “just in case”.
- [ ] **China ICP / additional permits** — only if you enable the China mainland storefront. Default: leave China off unless you have the filings.
- [ ] **Standard EULA** is fine. Do not attach a custom EULA unless legal writes one.
- [ ] **Family Sharing** — N/A (no IAP). Leave default.
- [ ] **In-App Events / custom product pages** — skip for 1.0.
- [ ] **Third-party SDK signatures / privacy manifests** — Expo modules should ship theirs; confirm in the Xcode privacy report after the first EAS archive.

---

## 6. Listing copy you should actually use (draft)

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
> Photo/share: system share sheet for a summary image. We do not request Photos access.
> No background audio, no push, no tracking, no data collection.
> iPhone only for 1.0.

---

## 7. Build & submit (when the remaining `[ ]` boxes are ticked)

```bash
cd frontend
npm test
npx eas login
npx eas build --platform ios --profile production
npx eas submit --platform ios
```

Then in App Store Connect: attach the build, fill Privacy, DSA, accessibility labels, social-media questions, 6.9" screenshots, privacy-policy URL, Review Notes, **Submit for Review**.

Android Play Store is a separate checklist (Data safety form, 12+ / PEGI, notification permission). Do not reuse this iOS list blindly.

---

## 8. Day-of-submit smoke test (30 minutes)

Do this on the **TestFlight** build, not Expo Go.

1. Delete the app, install TestFlight, launch **offline**.
2. Create “Push Day”, add Bench + a custom raise, start, log 3 sets, finish, share summary.
3. Lock during rest; confirm “Rest is over”.
4. Hit a PR (first set counts); dismiss the gold badge.
5. Export backup, wipe, import, confirm history returns.
6. Toggle Light mode + kg, open Profile charts. Pointers clear if you leave the tab.
7. Turn Mock on, then off — real data still there.
8. Force-quit mid-workout, reopen, finish.
9. Confirm Settings → TrackIt shows **no** Photos / Tracking / Background App Refresh you did not intend.

If any step fails, **do not submit**.

---

## 9. After 1.0 (not blockers — do not advertise them)

- iCloud / CloudKit sync (changes privacy labels).
- Apple Watch / Live Activities / Dynamic Island — only after a dedicated implementation.
- HealthKit — Health review + usage strings + medical disclaimer.
- IAP / “Pro” — StoreKit 2, restore, guideline 3.1.1.
- Accounts — then Sign in with Apple (4.8) **and** account deletion (5.1.1v).
- iPad / Mac — turn `supportsTablet` back on only after a real iPad pass + 13" screenshots.

Until those exist, the listing must not promise them.
