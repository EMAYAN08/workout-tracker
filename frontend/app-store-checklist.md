# TrackHit — App Store submit checklist

Use this file as the **do-this-in-order** guide to ship TrackHit to the iPhone App Store without a rejection.

TrackHit is a **local-first workout logger**. There is **no account, no server, no ads, no IAP, no analytics**. Workouts live in AsyncStorage on the phone. Rest alerts are **local notifications**. Backup is a user-exported JSON file.

Tick a box when that step is done. Expand a section for the exact clicks.

Apple’s rules: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (updated June 2026).

---

## Direct answers (read this first)

<details>
<summary><strong>I don’t have a Mac. Do I need Xcode before I submit?</strong></summary>

**No. Xcode is not mandatory. You cannot (and need not) run the iOS Simulator without a Mac.**

Apple Review installs **your TestFlight / App Store IPA**, not a Simulator build and not Expo Go.

TrackHit is Expo. EAS already compiles iOS **on Expo’s Macs in the cloud**. From Windows, Linux, or this machine:

1. Apple Developer Program ($99) + App Store Connect app record (browser).
2. `npx eas login` → `npx eas build --platform ios --profile production` (cloud).
3. `npx eas submit --platform ios` (cloud upload — **do not** use Transporter / Xcode Organizer).
4. Install **TestFlight** on your iPhone, run §13 there.
5. Submit for Review in App Store Connect (browser).

| You might think you need | What you actually use |
|---|---|
| Xcode Simulator | **TestFlight on a physical iPhone** |
| Xcode Organizer / Transporter | **`eas submit`** |
| A Mac to “open the project” | **expo.dev build page** + Connect |
| Inspect entitlements in Organizer | EAS build **credentials / logs** + Connect “Build metadata”. Privacy APIs are already in `app.json` |

**Still required without a Mac:** a real iPhone + TestFlight. Expo Go is a different binary (notifications, icon, entitlements). Do **not** submit Expo Go.

**The one Mac-shaped gap:** App Store **6.9" screenshots (1320×2868)**. If your phone is not a Pro Max class, capture on-device anyway and resize only if Apple rejects the size — or rent a cloud Mac for an hour to run Simulator. You do **not** need Xcode to ship the IPA.

Do **not** buy a Mac just to “test in Xcode.” TestFlight is the reviewer’s environment.

</details>

<details>
<summary><strong>Do I need Termly / Iubenda / a generated privacy policy?</strong></summary>

**No. Do not regenerate the current page with Termly (or similar).**

Apple does **not** require a lawyer-template or a generator. Guideline **5.1.1(i)** requires a **https** policy that is **specific to this app**, matches the binary, and is linked in Connect **and** in Settings.

Termly/Iubenda/PrivacyPolicies.com pages usually list cookies, IP logs, analytics, advertising partners, and “we collect device identifiers.” That text **does not match** TrackHit. Reviewers reject **mismatches** (policy says you collect; App Privacy says Data Not Collected). A generic template is a **higher** bounce risk than the page you already have.

Keep the hosted policy at https://emayan08.github.io/workout-tracker/privacy/

Only rewrite it if the **app** starts collecting or transmitting data (analytics, accounts, HealthKit, a server). Then update the page **and** App Privacy **before** that binary ships.

</details>

<details>
<summary><strong>Will Apple reject the current privacy policy?</strong></summary>

**Unlikely, if you paste the URL in Connect and the Settings links open on a real iPhone.** The policy text itself is enough for 5.1.1(i).

Live page: https://emayan08.github.io/workout-tracker/privacy/

| 5.1.1(i) requires | TrackHit page |
|---|---|
| Identify what data, if any | **None from the app.** On-device workouts, routines, settings listed |
| How it is collected / used | Typed by you, stored in the app sandbox, used to log training |
| Third parties (analytics, ads, SDKs, **including AI** per 5.1.2 2026) | None in the app. GitHub Pages for the site. No third-party AI |
| Retention / deletion | Settings → Delete all data; deleting the app also wipes |
| How to revoke consent | No collection to revoke. Notifications: iOS Settings → TrackHit |
| Contact | emayanramalingam@gmail.com + Halifax developer name |
| Public https, no login | GitHub Pages, already live |
| In-app link | Settings → Privacy Policy (already in the binary) |

**What actually gets apps rejected (not “too short” / “not Termly”):**

1. Dead or login-walled URL in Connect
2. No tappable policy **inside** the app
3. Policy lists SDKs / “we collect email” while App Privacy = Data Not Collected
4. App **does** talk to a server and the policy says it does not

You are not in (3) or (4). Finish (1) in Connect and confirm (2) on TestFlight.

PIPEDA / GDPR extra clauses are **not** an App Review checkbox for a no-collection app. Skip generators.

</details>

<details>
<summary><strong>Do I need Sign in with Apple or Google?</strong></summary>

**No. Do not add either.**

Guideline **4.8** (Login Services) only fires if the app offers a *third-party* login (Google, Facebook, etc.) as the way to create a primary account. Then you **must** also offer Sign in with Apple.

TrackHit has **no accounts at all**. People open the app and lift. Apple will **not** reject you for omitting Sign in with Apple or Google.

Do **not** add Google/Apple login “just in case.” That would *create* a 4.8 duty, plus **5.1.1(v) account deletion**, plus a privacy-label change, plus a backend.

Guideline **5.1.1(v)** also says: if the app doesn’t need an account, let people use it without a login. You already do that. Keep it.

**Demo account for review:** not required. Tell Review “no sign-in, data is on-device” (copy is in §12).

</details>

<details>
<summary><strong>Will Apple reject me because I collect no user data?</strong></summary>

No. “Data Not Collected” is a **valid** App Privacy answer. It is what you must select **if it is true**.

It stays true only if:

- No Firebase / Amplitude / Mixpanel / Sentry / Crashlytics
- No ads, no IDFA, no ATT prompt
- Fonts stay bundled (Violet Sans already is)
- Backup never uploads anywhere
- Rest notifications never hit APNs (local only)

If you later add any of those, update App Privacy **before** that binary ships. A mismatch between the nutrition label and the binary is a common rejection.

</details>

<details>
<summary><strong>I am not monetizing. Anything extra?</strong></summary>

**No IAP, no ads, no “Pro”, no subscriptions.**

- Price the app **Free** (or paid up-front — then no Restore is needed either).
- Do not put “Premium”, “Unlock”, or a price in screenshots or the description.
- Skip StoreKit, skip Restore Purchases, skip Family Sharing for IAPs.
- Guideline **3.1** only applies when you sell digital goods. You are not.

</details>

<details>
<summary><strong>Highest-risk rejection for *this* app (do these or you bounce)</strong></summary>

1. **Privacy Policy URL** in App Store Connect **and a tappable link inside the app** (Settings). Guideline **5.1.1(i)** — “easily accessible.” A Connect URL alone is not enough.
2. **Support URL** that actually loads and has a contact email (guideline **1.5**).
3. **6.9" iPhone screenshots** at **1320 × 2868**. Missing this blocks submit.
4. **Production IPA** via EAS. Expo Go cannot be submitted.
5. Listing copy that does **not** promise accounts, cloud, Health, Live Activities, or Dynamic Island.
6. **Mock data OFF** in every store screenshot.
7. Archive has **no** Push entitlement and **no** Photos permission.
8. EU **DSA trader** form filled if the EU storefront is on.

</details>

---

## 0. What is already done in the repo

You do **not** re-do these.

- [x] No login wall (Auth / `Login.jsx` removed)
- [x] No backend / API config
- [x] No `UIBackgroundModes: audio`
- [x] `expo-notifications` `enableBackgroundRemoteNotifications: false`
- [x] iPhone-only (`ios.supportsTablet: false`)
- [x] No Photo Library usage string (share sheet only)
- [x] `ITSAppUsesNonExemptEncryption` = false
- [x] Privacy manifest: UserDefaults `CA92.1`, file timestamp `C617.1`
- [x] Violet Sans bundled (no Google Fonts at runtime)
- [x] 1024×1024 RGB icon, no alpha (light + dark + tinted)
- [x] Mock data defaults **off**
- [x] Portrait locked
- [x] Version `1.0.0` / iOS `buildNumber` `1`
- [x] Est. 1RM labeled as a formula, not medical
- [x] Public privacy policy hosted (GitHub Pages) — do **not** replace with Termly
- [x] Public support + feedback pages
- [x] Settings → Privacy Policy / Support / Feedback open the Pages URLs

Still on you: Apple Developer account, **paste the privacy + support URLs in Connect**, screenshots, TestFlight, Connect forms, production build.

---

## 1. Apple Developer + App Store Connect account

<details>
<summary>1.1 Paid membership, 2FA, agreements</summary>

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year). Individual is fine.
2. Turn on two-factor for the Apple ID.
3. App Store Connect → **Agreements, Tax, and Banking**. Accept the Paid Apps agreement even if the app is free (Apple still wants banking on file).
4. Wait until status is **Active** before creating the app record.

- [ ] Developer Program active
- [ ] 2FA on
- [ ] Agreements accepted

</details>

<details>
<summary>1.2 Bundle ID <code>com.trackit.app</code></summary>

1. [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → **Identifiers** → **+**
2. App IDs → App → Description `TrackHit` → Bundle ID **Explicit** `com.trackit.app`
3. Capabilities: leave **Push Notifications OFF**. Leave Sign in with Apple OFF. Leave HealthKit OFF.
4. App Store Connect → My Apps → **+** → New App
   - Platforms: **iOS**
   - Name: `TrackHit` (or `TrackHit Workout Logger` if the name is taken — 30 character cap)
   - Primary language: English (U.S.)
   - Bundle ID: the one you just created
   - SKU: `trackit-ios` (internal, never shown)
   - User Access: Full Access

- [ ] Bundle ID created and owned
- [ ] App record created, bundle ID matches `app.json`

</details>

<details>
<summary>1.3 Availability: iPhone only</summary>

In App Store Connect → Pricing and Availability / iPhone / iPad:

1. **Turn off** iPad.
2. **Turn off** Apple Silicon Mac availability.
3. **Turn off** visionOS, Apple Watch, iMessage, App Clip.
4. Do **not** upload iPad screenshots.

`app.json` already has `"supportsTablet": false`. If iPad is left on in Connect, Apple expects iPad screenshots and an iPad-quality UI → rejection.

- [ ] iPhone only in Connect
- [ ] iPad / Mac / vision / Watch off

</details>

---

## 2. Privacy Policy (required in Connect **and** in the app)

<details>
<summary>2.1 Host a public policy page — <strong>already done</strong></summary>

**Do not generate a new policy with Termly.** The live page is the one to use:

**https://emayan08.github.io/workout-tracker/privacy/**

It already states, in plain language:

- What the app is (on-device workout log)
- **No accounts**
- **No data sent to a server**
- What stays on the phone (workouts, routines, custom exercises, settings)
- Rest notifications are scheduled **on the device** (and how to turn them off)
- Export/import is a file the user chooses; TrackHit does not upload it
- How to delete: Settings → Delete all data
- No analytics, no ads, no tracking, no third-party data sale, **no third-party AI**
- Children: not directed at kids
- Contact email
- Last-updated date

Regenerate only if you add a backend, analytics, accounts, or HealthKit.

- [x] Policy hosted at https://emayan08.github.io/workout-tracker/privacy/
- [x] Page loads in Safari without a login
- [x] Mentions on-device storage, no accounts, wipe path, contact email
- [ ] Open the URL in Safari on your iPhone once before submit (catch a Pages 404)

</details>

<details>
<summary>2.2 Link it inside TrackHit (Settings) — <strong>already in the binary</strong></summary>

Guideline **5.1.1(i)** requires the policy **in the app**, not only in Connect.

`Settings.jsx` already opens:

- Privacy Policy → `https://emayan08.github.io/workout-tracker/privacy/`
- Support → `https://emayan08.github.io/workout-tracker/support/`
- Feedback → `https://emayan08.github.io/workout-tracker/feedback/`

You still:

1. Install a **TestFlight / production** build (not Expo Go).
2. Tap each row on a physical iPhone. Safari must load the Pages URL, not a 404.
3. Do not change these to localhost.

Until a production binary with these rows is what Review installs, expect a **5.1.1** bounce if you submit Expo Go.

- [x] Privacy Policy row in Settings
- [x] Support / Contact row in Settings
- [ ] URLs tested on a physical iPhone (production or TestFlight binary)

</details>

<details>
<summary>2.3 Paste the URL in App Store Connect</summary>

App Store Connect → your app → App Information → **Privacy Policy URL**.

Same URL as in Settings.

- [ ] Privacy Policy URL saved in Connect

</details>

---

## 3. Support URL (required)

<details>
<summary>How to satisfy guideline 1.5 — <strong>page is live</strong></summary>

Reviewers click this. A 404 or a “coming soon” page is a rejection.

**Support URL:** https://emayan08.github.io/workout-tracker/support/

It already has: app name, what it does, contact email (`emayanramalingam@gmail.com`), link to privacy.

Also set **Support URL** on the iOS version page (not only App Information).

Marketing URL is optional. You may use https://emayan08.github.io/workout-tracker/ or leave it blank.

- [x] Support page live
- [ ] Support URL pasted on the version page in Connect
- [ ] Inbox `emayanramalingam@gmail.com` monitored (reviewer questions have a short clock)

</details>

---

## 4. App Privacy nutrition labels

<details>
<summary>Exact clicks — Data Not Collected</summary>

App Store Connect → App Privacy → **Get Started** / **Edit**.

1. “Do you or your third-party partners collect data from this app?” → **No**.
2. Confirm. Product page will show **Data Not Collected**.

Then **audit the binary** after the first EAS production build: Expo dashboard → that build → credentials / config, and App Store Connect → the build’s metadata. UserDefaults / file timestamps are already declared in `app.json` privacyManifests and are **not** “collecting user data.” If Connect or a privacy report shows Contact Info, Identifiers, Usage Data, or Diagnostics you did not expect, **stop and fix dependencies** before submit.

Do **not** check:

- Health
- Contact Info
- Location
- Identifiers / Device ID / Advertising Data
- Usage Data
- Diagnostics / Crash data
- Photos (share sheet is not your collection)
- Sensitive Info

Do **not** add `NSUserTrackingUsageDescription`. You do not track.

- [ ] App Privacy = Data Not Collected
- [ ] Privacy report of the archive reviewed, no surprise types

</details>

---

## 5. Sign in, accounts, deletion (none of these apply)

<details>
<summary>Checklist of things to skip on purpose</summary>

- [x] Skip Sign in with Apple capability
- [x] Skip Google Sign-In
- [x] Skip account deletion UI (no accounts → 5.1.1(v) does not apply)
- [x] Skip “Delete account” in the privacy policy as a server action — instead document **Settings → Delete all data**
- [x] Review Notes: “No account. Demo account not required.”
- [ ] Confirm the App Store Connect app record has **no** Sign in with Apple capability attached

</details>

---

## 6. Listing metadata (must match the binary)

<details>
<summary>6.1 Name, subtitle, promotional text</summary>

| Field | Suggested | Limit |
|---|---|---|
| Name | TrackHit | 30 |
| Subtitle | Private workout log | 30 |
| Promotional text | Your sets, rest, and PRs — saved only on this iPhone. | 170 |

If `TrackHit` is taken, use `TrackHit Workout Logger`.

**Do not write:** #1, best, Pro, Premium, cloud sync, Apple Health, Live Activities, Dynamic Island, social feed, AI coach, medical, “diagnoses injury.”

- [ ] Name unique and reserved
- [ ] Subtitle pasted
- [ ] Promotional text pasted

</details>

<details>
<summary>6.2 Description (paste this)</summary>

> TrackHit is a workout logger that lives on your iPhone. No account. No cloud. Your training never leaves this device.
>
> Build routines and custom exercises, then log every set with a dedicated number pad. Rest between sets with an optional lock-screen timer. Hit a personal record and you’ll see it.
>
> History, a consistency map, and strength charts show how you actually trained — by month, quarter, or year.
>
> Switch phones with an export. Start over anytime. Pounds or kilograms. Dark or light. A color you choose.
>
> Estimated 1-rep max is a formula, not medical advice.

- [ ] Description pasted
- [ ] No health claims, no unshipped features

</details>

<details>
<summary>6.3 Keywords, category, age, copyright</summary>

- Keywords: `workout,gym,lifting,logger,routine,sets,reps,strength,fitness,training` (100 char cap, no competitor names, no “#1”)
- Primary category: **Health & Fitness**
- Secondary: optional **Sports**
- **Not** Medical
- Age rating questionnaire: typically **4+**. Do **not** check medical/treatment, frequent profanity, or unrestricted web access.
- Copyright: `2026 Emayan Vadivel` (or your legal name)
- What’s New for 1.0: you can repeat the first paragraph of the description. Do not invent a fake changelog.

- [ ] Keywords
- [ ] Health & Fitness, not Medical
- [ ] Age 4+, questionnaire honest
- [ ] Copyright year + name

</details>

<details>
<summary>6.4 Features you must NOT mention</summary>

The binary does **not** include these. Mentioning them is guideline **2.3** (inaccurate metadata) / **2.5.2**.

- Accounts / Sign in with Apple / Google
- iCloud or any cloud sync
- Apple Health / HealthKit
- Dynamic Island Live Activities
- Apple Watch
- Social feed, follow, comments
- Paid Pro tier
- A website backend
- “Coming soon”

- [ ] Listing and screenshots only show shipped features

</details>

---

## 7. Screenshots (blocks submit if wrong)

<details>
<summary>Required size and how to capture</summary>

**Required 2026 iPhone set:** **6.9"** → **1320 × 2868** (iPhone 16 Pro Max / 17 Pro Max class). Upload **3–10**. Apple scales down for older phones. You do **not** need a separate 6.5" set if 6.9" is present.

How:

1. Use a physical Pro Max, or Simulator → iPhone 16 Pro Max / 17 Pro Max.
2. **Window → Physical Size** off; capture at native resolution.
3. iOS Simulator: `File → Save Screen` or `Cmd+S`. Confirm the PNG is 1320×2868 (or 1290×2796 — Apple still accepts the older 6.7" size as a fallback, but prefer 1320×2868).
4. Light **or** Dark is fine; Dark is TrackHit’s default and photographs better. Stay consistent.
5. Guideline **2.3.3**: show the **app in use**, not the splash, not a logo collage.

**Capture these 5–8 frames (Mock data OFF, or a real logged week you created):**

1. Routines list with at least one routine
2. Active workout (sets visible, rest timer if possible)
3. Profile — consistency map + stats
4. Profile — strength / duration charts
5. History calendar with a day open
6. Settings (units, colors, backup) — **Mock toggle must read Off**

**Do not:**

- Show the “Demo data” banner
- Show Android chrome
- Show Expo “development build” / `__DEV__` banners
- Fake Dynamic Island live activities
- Use iPad shots
- Stretch a 6.1" capture

Optional preview video: real device footage only, no Health rings you didn’t ship.

- [ ] 3–10 screenshots at 6.9" (1320×2868)
- [ ] No Mock banner, no unshipped features
- [ ] iPad screenshot slots empty

</details>

---

## 8. App icon, splash, version

<details>
<summary>Store assets vs binary</summary>

Already in the repo:

- `assets/icon.png` / `icon-light.png` — 1024×1024, RGB, **no transparency**, no rounded-corner bake-in (Apple rounds it). Cream TH print.
- `assets/icon-dark.png` — 1024×1024 RGB dark-mode pair (wired as `ios.icon.dark`)
- `assets/icon-tinted.png` — white glyph + alpha (`ios.icon.tinted` + Android `monochromeImage`)
- Splash `#111111`
- Notification glyph for Android; iOS uses the app icon

You still:

1. Upload the 1024 icon in Connect if asked (EAS usually pulls from `app.json`).
2. Bump `ios.buildNumber` in `app.json` on **every** new upload (`1` → `2` → …). Version `1.0.0` can stay until you change features.
3. Confirm the store icon is not the Expo default.

- [ ] Icon is the cream TH-print TrackHit mark (not Expo, not the old barbell plate)
- [ ] `buildNumber` plan: increment per upload

</details>

---

## 9. Production binary (EAS)

<details>
<summary>9.1 One-time EAS setup</summary>

```bash
cd frontend
npm i -g eas-cli
npx eas login
npx eas init          # link to Expo account / project
npx eas credentials   # iOS distribution cert + App Store profile for com.trackit.app
```

`eas.json` already has a `production` profile.

- [ ] `eas login` works
- [ ] Project linked
- [ ] Distribution cert + App Store provisioning profile exist

</details>

<details>
<summary>9.2 Build the IPA</summary>

```bash
cd frontend
npm test
npx eas build --platform ios --profile production
```

Wait for the Expo build to finish on [expo.dev](https://expo.dev). You do **not** need to download the IPA onto a Mac.

**Confirm from the EAS page / logs (no Xcode):**

- Profile is **production** (not `development` / `preview`)
- Distribution = **store** / App Store
- Push Notifications capability **off**
- No development-client / Expo Go banner in TestFlight

Expo Go and `preview` / `development` profiles **cannot** go to the App Store.

- [ ] Production EAS build succeeded
- [ ] TestFlight install is the production profile, not Expo Go
- [ ] Tests passed before the build

</details>

<details>
<summary>9.3 TestFlight before Review</summary>

1. `npx eas submit --platform ios` (cloud; skip Transporter / Xcode)
2. Connect → TestFlight → wait for processing
3. Add yourself as an internal tester
4. **Delete Expo Go TrackHit** from the phone so you are not testing the wrong binary
5. Install the TestFlight build
6. Run §13 smoke test **offline**

Do not submit for Review until TestFlight feels like a finished 1.0.

- [ ] TestFlight build installed on a physical iPhone
- [ ] Smoke test passed

</details>

---

## 10. Connect compliance forms (easy to miss, 2025–2026)

<details>
<summary>10.1 Export compliance / encryption</summary>

`app.json` already sets `ITSAppUsesNonExemptEncryption: false` (HTTPS to nowhere + standard iOS crypto does not count as exempt-needing documentation for this app).

Still click through **App Store Connect → App Information / the version → Export Compliance** once and answer **No** (the app does not use non-exempt encryption).

- [ ] Export compliance answered No in Connect

</details>

<details>
<summary>10.2 EU Digital Services Act (DSA)</summary>

App Information → App Store Regulations → **EU Digital Services Act**.

If **any** EU country is in your availability list you must declare **trader** vs **non-trader**.

- Individual hobby ship, no company: often **non-trader** — follow the on-screen definition (you are not a trader if you are a consumer acting outside a trade).
- If you **are** a trader: you must publish a contact phone + email on the product page.

[Apple’s DSA help](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-compliance-information/).

Leaving this blank **blocks** submit for EU distribution.

- [ ] DSA form completed (or EU storefront turned off on purpose)

</details>

<details>
<summary>10.3 Social media questionnaire</summary>

New apps (as of 2026) get a social-media capabilities form.

TrackHit is **not** a social app: no public feed, DMs, UGC, or profiles.

Answer **No** to social-media capabilities. Do not invent a “community.”

- [ ] Social questionnaire = No

</details>

<details>
<summary>10.4 Accessibility Nutrition Labels</summary>

Voluntary now (product pages from iOS 26), expected to matter more later.

Honest answers only. Suggested starting point after you actually walk the app:

| Label | Claim only if true |
|---|---|
| VoiceOver | You have walked New Routine, complete set, Finish, Wipe with VoiceOver |
| Larger Text | Dynamic Type at the largest size does not clip Profile / Settings |
| Dark Interface | Dark is the default — this one you can claim |
| Sufficient Contrast | Brutalist black/white — generally yes; verify chart text |
| Differentiate Without Color | Heatmap + muscle tags also have layout, not color alone |
| Reduced Motion | Only if you tested Reduce Motion and the app still works |
| Voice Control | Only after a real pass |

Do **not** check VoiceOver if you have not tested it. False accessibility claims are a metadata issue.

- [ ] Accessibility labels filled honestly (or left blank if you have not tested)

</details>

<details>
<summary>10.5 Other Connect toggles</summary>

- [ ] Content rights: you own the icon, copy, and generic lift names in `src/data/catalog.js`. No trademarked program names (“Starting Strength®” etc.).
- [ ] Advertising Identifier: **No**. Do not use IDFA.
- [ ] Standard Apple EULA (do not attach a custom one unless a lawyer writes it)
- [ ] Family Sharing: N/A (no IAP)
- [ ] In-App Events / custom product pages: skip for 1.0
- [ ] China mainland storefront: leave **off** unless you have ICP filings
- [ ] Primary language English; do not add FR/DE/JA locales unless the UI is translated (it is not)

</details>

---

## 11. Pricing and IAP

<details>
<summary>Free app, no in-app purchase</summary>

1. Pricing → **Free** (or a one-time paid price).
2. Do **not** add In-App Purchases.
3. No Restore button needed.
4. Screenshots and description must not tease a paid tier.

- [ ] Price set
- [ ] Zero IAP products on the app record

</details>

---

## 12. Review Notes (paste this)

<details>
<summary>Notes for App Review — copy/paste</summary>

> No sign-in. All data is on-device. Demo account is not required.
>
> To preview charts: Settings → Mock data → On. Please turn it Off before judging empty states.
>
> Rest notifications: start a routine, complete a set, lock the device. Local only — we do not use push (no aps-environment).
>
> Share uses the system share sheet. We do not request Photos access.
>
> Backup: Settings → Export / Import. Wipe: Settings → Delete all data.
>
> Privacy Policy and Support are linked in Settings.
>
> No background audio, no tracking, no data collection. iPhone only.

Also fill **Contact** with an email and phone Apple can reach **the same day**.

- [ ] Review Notes pasted
- [ ] Contact email + phone you will answer

</details>

---

## 13. Device QA (TestFlight, not Expo Go)

<details>
<summary>13.1 Happy path (reviewer’s first five minutes)</summary>

- [ ] Fresh install, **offline / Airplane mode**: app opens, splash + phrase, empty Routines looks finished (no lorem)
- [ ] Create a routine → add a catalog lift + a custom lift → start → log 3 sets on the keypad → rest → finish → summary → share
- [ ] Keypad: Next, swipe down, does not sit under the tab bar
- [ ] Cancel does **not** write a session; Finish does
- [ ] PR badge on a first-time heavy set; X closes it; auto-dismiss ~5s; works in Light and Dark

</details>

<details>
<summary>13.2 Notifications, background, restore</summary>

- [ ] Complete a set, lock the phone, wait until rest ends → “Rest is over” fires
- [ ] Deny notification permission once → in-app rest timer still runs, no crash
- [ ] Start a workout, switch to Mail, return → timer and sets still there
- [ ] Force-quit mid-workout, reopen → session restores
- [ ] Finish / cancel clears the rest notification (`cancelRestNotification`)

</details>

<details>
<summary>13.3 Data, units, theme, mock</summary>

- [ ] Log in lb, switch to kg mid-workout, finish, reopen history — numbers converted
- [ ] Export `trackhit-backup-YYYY-MM-DD.json`, Wipe, Import, history returns
- [ ] Wipe does **not** need an Apple ID
- [ ] Mock ON does not destroy real data; OFF restores it
- [ ] Light mode + Dark mode: charts, heatmap, PR card, keypad, Settings
- [ ] Accent / chart colors apply to buttons and graphs
- [ ] Privacy Policy and Support rows open the real URLs

</details>

<details>
<summary>13.4 Layout / a11y / devices</summary>

- [ ] iPhone SE-class: keypad, radar labels, consistency map, tab bar
- [ ] Dynamic Island / notch: Active workout, keypad, summary, Settings safe areas
- [ ] Latest iOS **and** your deployment-target iOS
- [ ] Portrait lock (Control Center rotation does not landscape the UI)
- [ ] Dynamic Type largest: Profile cards and Settings not clipped
- [ ] VoiceOver: tab bar, New Routine, Complete set, Finish, Wipe have labels
- [ ] Settings → TrackHit: **no** Photos, Tracking, or Background App Refresh you did not intend

If any of these fail, **do not submit**.

</details>

---

## 14. Submit for Review

Do this only after the boxes above are ticked.

1. Attach the processed TestFlight / production build to the iOS version.
2. Confirm Privacy, DSA, social, encryption, age rating.
3. Upload 6.9" screenshots.
4. Paste description, keywords, support URL, privacy URL, review notes.
5. Availability = iPhone, territories you want (remember DSA if EU is on).
6. **Add for Review** → **Submit for Review**.

Typical first review: 24–48 hours. Rejection is a conversation — reply in Resolution Center with facts, do not argue tone.

- [ ] Build attached
- [ ] All Connect URLs load
- [ ] Submit tapped
- [ ] Watch email + Resolution Center

---

## 15. If Apple rejects — TrackHit-specific replies

<details>
<summary>Common bounce → what to send back</summary>

| They say | You do |
|---|---|
| 2.1 incomplete / crash | Fix on TestFlight, increment `buildNumber`, new EAS production, reply with the build number |
| 2.3.3 screenshots | Replace with in-use 1320×2868 shots, Mock off |
| 5.1.1 no privacy policy in-app | Ship Settings link, new binary, reply with a screenshot of the row |
| 4.8 Sign in with Apple | Reply: “TrackHit has no accounts and no third-party login. 4.8 does not apply.” |
| 5.1.1(v) account deletion | Same: no accounts. Wipe is Settings → Delete all data |
| 2.5.4 / push | Show archive has no `aps-environment`; rest is `scheduleNotificationAsync` local |
| 4.2 minimum function | Point at routines + live session + history + backup; iPhone-only is intentional |
| Health / 1.4.1 | “Est. 1RM is Brzycki, labeled estimate, not a medical device.” Soften listing copy |
| 3.1.1 IAP | “App is free, no digital goods, no StoreKit.” |
| Background audio | Already removed from `app.json`; send the Info.plist snippet |
| Demo account | “No sign-in. Settings → Mock data is optional preview. Please turn Off for empty states.” |

Never add a fake login to “satisfy” 4.8.

</details>

---

## 16. After 1.0 (do not advertise until built)

- [ ] iCloud / CloudKit — would change privacy labels
- [ ] Sign in / Google — would require Sign in with Apple **and** in-app account deletion
- [ ] HealthKit — usage strings + Health review
- [ ] Live Activities / Dynamic Island / Watch
- [ ] IAP “Pro” — StoreKit 2 + restore (3.1.1)
- [ ] iPad / Mac — `supportsTablet: true` only after a real iPad pass + 13" shots (2064×2752)
- [ ] Analytics / Sentry — update App Privacy **first**

Until those exist, the listing must not promise them.

---

## 17. Final gate (print this)

- [x] Privacy Policy URL live + **in Settings** (still paste the URL in Connect)
- [x] Support URL live (still paste it on the version page)
- [ ] App Privacy = Data Not Collected
- [ ] No Sign in with Apple / Google (correct — do not add)
- [ ] No IAP, Free (or paid up-front)
- [ ] 6.9" screenshots, Mock off
- [ ] iPhone-only availability
- [ ] Production EAS IPA on TestFlight
- [ ] Archive: no push, no photos, no audio background
- [ ] DSA / encryption / social forms done
- [ ] Review Notes pasted
- [ ] §13 smoke test passed on TestFlight **offline**
- [ ] Contact email you will answer in 24h
- [ ] Privacy + Support URLs tested on a physical iPhone

When every line is ticked: **Submit for Review.**
