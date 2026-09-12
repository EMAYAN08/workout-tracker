# TrackIt — React Native (Expo)

Mobile app for the TrackIt workout tracker. Full lift-and-shift of the previous React PWA onto Expo / React Native. The Express + Mongo backend is unchanged.

## Run on your phone (Expo Go)

1. Install [Expo Go](https://expo.dev/go) (SDK 57) on iOS or Android.
2. From `frontend/`:

```bash
npm install
npx expo start --tunnel
```

3. Open Expo Go and scan the QR code, or type the `exp://` URL it prints.

The app talks to the production API at `https://workout-tracker-ngpe.onrender.com`.

Copy `.env.example` to `.env` if you want to point at a different backend:

```
EXPO_PUBLIC_API_URL=https://workout-tracker-ngpe.onrender.com
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start Metro bundler |
| `npm run ios` | Open iOS simulator |
| `npm run android` | Open Android emulator |
| `npm run web` | Run the Expo web build |
| `npm run tunnel` | Start with a public Expo Go tunnel |

## What's included

- Login / auto-register (same `/api/auth/login` backend)
- Empty workout + routine-started workouts, rest-day logging
- Custom numpad, set timer, rest timer, LBS/KGS toggle
- Custom exercises + routine builder
- Profile dashboard: streaks, consistency map, strength ring, progression charts
- Calendar history + workout detail
- Share workout summary / consistency map

## Stack

- Expo SDK 57 / React Native 0.86 / React 19
- AsyncStorage for session + in-progress workout persistence
- lucide-react-native icons, react-native-svg charts
- Outfit font via `@expo-google-fonts/outfit`

Backend lives in `../backend` and is not modified by this migration.
