# TrackHit — App Store submit checklist

Use this file as the **do-this-in-order** guide to ship TrackHit to the iPhone App Store without a rejection.

TrackHit is a **local-first workout logger**. There is **no account, no server, no ads, no IAP, no analytics**. Workouts live in AsyncStorage on the phone. Rest alerts are **local notifications**. Backup is a user-exported JSON file.

Tick a box when that step is done. Expand a section for the exact clicks.

Apple’s rules: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (updated June 2026).

---

## Direct answers (read this first)

\u003cdetails\u003e
\u003csummary\u003e\u003cstrong\u003eI don’t have a Mac. Do I need Xcode before I submit?\u003c/strong\u003e\u003c/summary\u003e

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

\u003c/details\u003e
