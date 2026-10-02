# TrackHit App Review — Guideline 2.1 (Information Needed)

**Status:** iOS 1.0.0 (1) rejected  
**Bucket in Connect:** 2.1.0 Performance: App Completeness  
**Actual letter:** Guideline 2.1 — Information Needed — New App Submission  
**Date of Apple message:** 21 Sep 2026, 9:27 PM

This is **not** a crash rejection and **not** “the app is incomplete.” Apple paused a **first-app / limited review history** account and asked for a device recording plus written answers. Same binary. Reply, attach the video, then **Resubmit to App Review**.

---

## Main reason

> This app has been submitted by a developer account that has a limited App Review history. We need additional information to better understand the app and complete the review.

The “Prevent Common Issues” list (screenshots, IAP, demo login) is a **generic checklist**, not extra rejection reasons — unless Connect still has Imagine mockups as screenshots (that would be 2.3.3).

You **do not need a new EAS build** for this letter.

---

## What Apple asked vs TrackHit

| # | They asked | TrackHit |
|---|---|---|
| 1 | Screen recording on a **physical iPhone**, latest iOS, from launch | Required |
| 1a | Account register / login / delete account | **N/A — no accounts** |
| 1b | UGC + report/block | **N/A — no social feed** |
| 1c | Paid content / IAP | **N/A — free, no IAP** |
| 2 | Purpose + audience | Local workout log for people who lift |
| 3 | How to use / login / sample files | Open app, no login; optional Mock data |
| 4 | External services | None for core features |
| 5 | Regional differences | Same worldwide |
| 6 | Regulated industry / licensed content | No |

---

## Step by step

### 1. Confirm screenshots are real (do this first)

App Store Connect → version 1.0 → **Previews and Screenshots**.

- Real TrackHit captures (routines, live set, history, profile) → keep them.
- Imagine mockups (garbled UI, fake phone chrome) → **replace now**.

Replacement rules:

- Mock data **Off**
- Portrait only (do not mix landscape)
- Size Connect asked for on 6.5": **1242 × 2688** or **1284 × 2778**
- At least **3** shots of the app **in use**, not only splash

### 2. Record on a physical iPhone

Use a real device on the latest iOS you can install. Install **TestFlight build 1.0.0 (1)** — the rejected binary. Not Simulator. Not a random Expo Go session.

**How to record**

1. Settings → Control Center → add **Screen Recording**.
2. TrackHit Settings: **Mock data Off**. Logging 2–3 real sets in the recording is better than mock.
3. Go to the **Home Screen**. Start recording. After 3-2-1, **tap TrackHit**.
4. Record **2–4 minutes**, stop, save to Photos/Files. Trim Control Center off the start if needed.
5. Keep the file reasonable (iPhone MP4 is fine).

**Shot list (in order)**

1. Cold launch (splash / typing line).
2. Routines → start a routine (or Start empty workout).
3. Log a set (weight + reps) → rest timer → Skip or wait a beat.
4. **Finish** → summary.
5. History calendar → open that day.
6. Profile: consistency map, scrub a chart if you can.
7. Settings: unit, appearance, **Privacy policy** link, Export backup; point out **Delete all data** (do not wipe the review phone).
8. Optional: start a **Rest Day** routine with 0 exercises → **Log rest**.

Do **not** show a login (there isn’t one). Do **not** show Xcode, a website, or Imagine mockups.

### 3. Paste the Resolution Center reply

App Store Connect → rejection page → **Reply** under Apple’s message. Attach the video.

Copy the same text to: version → **App Review Information** → **Notes**.

#### Reply to paste

```
Hello App Review,

Thank you. TrackHit 1.0.0 (1) is ready for review. This is my first App Store app, which is why the account has limited review history. Answers to your six items are below. A screen recording from a physical iPhone is attached.

1. Screen recording
Attached. Recorded on a physical iPhone running the latest iOS, using TestFlight build 1.0.0 (1). It starts at the Home Screen, launches TrackHit, and shows a typical session: start a routine, log sets, rest timer, Finish, History, Profile, and Settings.

TrackHit has no user accounts, so there is no registration, login, or account-deletion flow. Data lives only on the device. The user can wipe it in Settings → Delete all data.

There is no user-generated content that other people can see (no feed, comments, or profiles), so there is no report/block flow.

There is no paid content and no In-App Purchase. The app is free.

2. Purpose and audience
TrackHit is a local-first workout logger for people who lift. It solves “I want to record sets, rest, and history without creating an account or sending training data to a server.” Value: routines, live logging, rest timer, calendar, consistency map, charts, and a JSON backup the user owns.

3. How to use it
Open the app. There is no login and no demo account.
- Routines → Start a routine (or Start empty workout).
- Log weight/reps → Finish.
- History / Profile for past sessions.
- Settings → Mock data can be turned On to preview charts with sample workouts; please turn it Off when judging empty states. No sample file is required.

4. External services
None for core functionality. No backend, no auth provider, no analytics SDK, no ads, no payment processor, no AI API. Workouts are stored on-device (AsyncStorage). Optional iOS local notifications power the rest timer. Distribution is App Store / TestFlight only. The privacy policy and support pages are static GitHub Pages:
https://emayan08.github.io/workout-tracker/privacy/
https://emayan08.github.io/workout-tracker/support/

5. Regions
The app functions the same in all regions. No geo-restricted features or content.

6. Regulated industry / third-party material
Not a medical device, not HealthKit, no licensed exercise video/music. Estimated 1RM is a labeled gym formula (Brzycki), not a clinical claim. No extra credentials apply.

Please continue the review of 1.0.0 (1). I am happy to provide anything else you need.

Emayan Vadivel
TrackHit
```

### 4. App Review Information fields

On the version page:

| Field | Value |
|---|---|
| Contact name | Emayan Vadivel |
| Contact email | emayanramalingam@gmail.com |
| Phone | your number |
| Demo account | leave blank, or `No account. No sign-in.` |
| Notes | paste the reply above |

### 5. Reply, then Resubmit

1. Post the reply **with the video attached** in Resolution Center.
2. Click **Resubmit to App Review**.
3. Do **not** increment `buildNumber` unless they later say it crashed.

Status should return to **In Review**. This template usually clears in another 24–48 hours if the recording is clear.

---

## What not to do

- Don’t add Sign in with Apple “to look complete.”
- Don’t add IAP.
- Don’t argue about being a new developer — answer the six points.
- Don’t send a new binary for this letter.
- Don’t upload Imagine mockups as store screenshots.

---

## If they bounce again

| They say | You do |
|---|---|
| 2.1 bugs / crash | Fix on TestFlight, bump `ios.buildNumber` in `app.json`, new EAS production, reply with the new build |
| 2.3.3 screenshots | Replace with in-use 6.5" shots, Mock off |
| 5.1.1 privacy | Privacy URL is already in Settings; reply with a screenshot of the row |
| 4.8 Sign in with Apple | “TrackHit has no accounts. 4.8 does not apply.” |
| 3.1.1 IAP | “Free, no StoreKit.” |
| Demo account | “No sign-in. Settings → Mock data is optional. Please turn Off for empty states.” |

See also [app-store-checklist.md](./app-store-checklist.md).
