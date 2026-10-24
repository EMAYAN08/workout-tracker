import ActivityKit
import ExpoModulesCore
import Foundation

public class TrackHitLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TrackHitLiveActivity")

    Function("areActivitiesEnabled") { () -> Bool in
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Creates the activity for `workoutId`, or updates the existing one.
    // Any other TrackHit activity (stale / duplicate / old workout) is ended,
    // so there is never more than one on screen. Returns the activity id,
    // or "" when Live Activities are disabled by the user.
    AsyncFunction("upsert") { (workoutId: String, workoutName: String, stateJson: String, staleAtMs: Double) async throws -> String in
      let state = try JSONDecoder().decode(
        TrackHitWorkoutAttributes.ContentState.self,
        from: Data(stateJson.utf8)
      )
      let staleDate: Date? = staleAtMs > 0 ? Date(timeIntervalSince1970: staleAtMs / 1000.0) : nil
      let content = ActivityContent(state: state, staleDate: staleDate)

      var target: Activity<TrackHitWorkoutAttributes>? = nil
      for activity in Activity<TrackHitWorkoutAttributes>.activities {
        let alive = activity.activityState == .active || activity.activityState == .stale
        if target == nil && alive && activity.attributes.workoutId == workoutId {
          target = activity
        } else {
          await activity.end(nil, dismissalPolicy: .immediate)
        }
      }

      if let existing = target {
        await existing.update(content)
        return existing.id
      }

      if !ActivityAuthorizationInfo().areActivitiesEnabled {
        return ""
      }

      let attributes = TrackHitWorkoutAttributes(workoutId: workoutId, workoutName: workoutName)
      let activity = try Activity<TrackHitWorkoutAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
      return activity.id
    }

    AsyncFunction("endAll") { () async -> Int in
      var count = 0
      for activity in Activity<TrackHitWorkoutAttributes>.activities {
        await activity.end(nil, dismissalPolicy: .immediate)
        count += 1
      }
      return count
    }
  }
}
