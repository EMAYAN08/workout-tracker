# WorkoutTracker API Documentation

Welcome to the API reference for **WorkoutTracker**. This document serves as a comprehensive guide to the backend RESTful architecture, detailing the endpoints used to power user authentication, exercise management, workout tracking, and push notifications.

## Table of Contents
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Exercises](#exercises)
- [Routines](#routines)
- [Workouts](#workouts)
- [Push Notifications](#push-notifications)

---

## Base URL
All API requests should be prefixed with the configured `VITE_API_URL` environment variable (defaulting to `http://localhost:5000` in local development).

All JSON payloads should be sent with the `Content-Type: application/json` header.

---

## Authentication

### `POST /api/auth/login`
Authenticates an existing user or automatically registers a new one.

**Request Body:**
```json
{
  "username": "user123",
  "password": "securepassword"
}
```

**Responses:**
- `200 OK`: Login successful or User automatically created and logged in.
- `401 Unauthorized`: Invalid password.
- `400 Bad Request`: Missing username or password.

---

## Exercises

Manages user-defined custom exercises and queries the ExerciseDB API proxy.

### `GET /api/exercises/custom?username={username}`
Fetches all custom exercises created by a specific user.

### `POST /api/exercises/custom`
Creates a new custom exercise.

**Request Body:**
```json
{
  "username": "user123",
  "id": "ex_123456789",
  "name": "Decline Bench Press",
  "muscleGroup": "chest",
  "gifUrl": "https://example.com/demo.gif",
  "unitSaved": "lbs",
  "defaultSets": [
    { "reps": 10, "weight": 135, "type": "Working" }
  ]
}
```

### `PUT /api/exercises/custom/:id`
Updates an existing custom exercise.
> [!IMPORTANT]
> Updating a custom exercise triggers an automatic database cascade that updates the exercise definitions inside all saved `Routines` to keep historical template data synchronized.

### `DELETE /api/exercises/custom/:id`
Deletes a custom exercise. Similar to `PUT`, this automatically pulls/removes the exercise from any saved `Routines` that reference it.

### `GET /api/exercises/search?q={query}&username={username}`
Searches for exercises by name. 
> [!NOTE]
> This endpoint features a robust caching and proxy layer. If the query is >= 3 characters, it proxies a request to `ExerciseDB`, caches the result to prevent rate-limiting, and merges the external data with the user's local `CustomExercises`.

---

## Routines

Routines are template blueprints that users can construct to start structured workouts quickly.

### `GET /api/routines?username={username}`
Retrieves all routine templates for a specific user.

### `POST /api/routines`
Saves a new routine template.

**Request Body:**
```json
{
  "username": "user123",
  "id": "rt_987654321",
  "name": "Push Day 1",
  "exercises": [
    {
      "id": "ex_1234",
      "name": "Bench Press",
      "defaultSets": [...]
    }
  ]
}
```

### `PUT /api/routines/:id`
Updates an existing routine template (e.g., adding/removing exercises or changing default set weights).

### `DELETE /api/routines/:id`
Deletes a routine template permanently.

---

## Workouts

Handles the immutable historical logs of completed workout sessions.

### `GET /api/workouts?username={username}`
Fetches the user's entire workout history, sorted descending by timestamp.

### `POST /api/workouts`
Commits an active workout session to history.

**Request Body:**
```json
{
  "username": "user123",
  "id": "wk_123456789",
  "routineId": "rt_987654321",
  "routineName": "Push Day 1",
  "timestamp": "2026-08-25T10:00:00Z",
  "durationSeconds": 3600,
  "volume": 12500,
  "exercises": [
    {
      "id": "ex_1234",
      "name": "Bench Press",
      "sets": [
        { "reps": 10, "weight": 135, "completedAt": 1692960000000 }
      ]
    }
  ]
}
```

---

## Push Notifications

Handles background rest timers by communicating with browser Service Workers via the Web Push API.

### `POST /api/push/schedule`
Schedules a push notification to be sent to the user's device when a rest timer completes.

**Request Body:**
```json
{
  "subscription": { 
    "endpoint": "...", 
    "keys": { "p256dh": "...", "auth": "..." } 
  },
  "delaySeconds": 90
}
```
**Response:** Returns a `taskId` used to track the timer on the server.

### `POST /api/push/cancel`
Cancels a pending rest timer notification if the user decides to skip their rest period.

**Request Body:**
```json
{
  "taskId": "push_1692960000000_123"
}
```
