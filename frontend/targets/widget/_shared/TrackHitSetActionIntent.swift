import ActivityKit
import AppIntents
import Foundation

let trackHitAppGroupId = "group.com.trackhit.app"
let trackHitActionKeyPrefix = "trackhit.action."
let trackHitActionNotification = Notification.Name("TrackHitLiveActivityAction")

/// Lock screen / Dynamic Island button. As a LiveActivityIntent it runs in the
/// app's process (the system launches the app in the background if needed).
/// It (1) queues the action in the App Group for the JS side, which applies it
/// with the same code as an in-app tap, (2) updates the activity instantly,
/// (3) pings the JS side if it's running.
@available(iOS 17.0, *)
struct TrackHitSetActionIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Workout set action"
  static let isDiscoverable: Bool = false

  @Parameter(title: "Action") var action: String
  @Parameter(title: "Workout") var workoutId: String
  @Parameter(title: "Exercise") var exerciseId: String
  @Parameter(title: "Exercise index") var exerciseIndex: Int
  @Parameter(title: "Set index") var setIndex: Int

  init() {}

  init(action: String, workoutId: String, exerciseId: String, exerciseIndex: Int, setIndex: Int) {
    self.action = action
    self.workoutId = workoutId
    self.exerciseId = exerciseId
    self.exerciseIndex = exerciseIndex
    self.setIndex = setIndex
  }

  func perform() async throws -> some IntentResult {
    let id = UUID().uuidString
    let payload: [String: Any] = [
      "id": id,
      "type": action,
      "workoutId": workoutId,
      "exerciseId": exerciseId,
      "exerciseIndex": exerciseIndex,
      "setIndex": setIndex,
      "at": Date().timeIntervalSince1970 * 1000.0,
    ]
    if let data = try? JSONSerialization.data(withJSONObject: payload),
       let json = String(data: data, encoding: .utf8) {
      let defaults = UserDefaults(suiteName: trackHitAppGroupId) ?? UserDefaults.standard
      defaults.set(json, forKey: trackHitActionKeyPrefix + id)
    }
    await TrackHitLiveActivityFeedback.apply(
      action: action,
      workoutId: workoutId,
      exerciseId: exerciseId,
      setIndex: setIndex
    )
    NotificationCenter.default.post(name: trackHitActionNotification, object: nil)
    return .result()
  }
}

@available(iOS 17.0, *)
enum TrackHitLiveActivityFeedback {
  static func apply(action: String, workoutId: String, exerciseId: String, setIndex: Int) async {
    guard let activity = Activity<TrackHitWorkoutAttributes>.activities.first(where: {
      $0.attributes.workoutId == workoutId
    }) else { return }

    var s = activity.content.state
    let now = Date().timeIntervalSince1970
    let matches = s.hasTarget && s.targetExerciseId == exerciseId && s.targetSetIndex == setIndex
    var stale: Date? = nil

    switch action {
    case "start":
      guard matches, s.setStart == nil else { return }
      s.setStart = now
      s.restStart = nil
      s.restEnd = nil
      s.restOver = false
    case "complete":
      guard matches, s.canComplete else { return }
      let end = now + max(1, s.restTargetSec)
      s.setStart = nil
      s.restStart = now
      s.restEnd = end
      s.restOver = false
      stale = Date(timeIntervalSince1970: end)
      if s.hasNext {
        s.hasTarget = true
        s.canComplete = s.nextCanComplete
        s.exerciseName = s.nextExerciseName
        s.detail = s.nextDetail
        s.setNumber = s.nextSetNumber
        s.setCount = s.nextSetCount
        s.targetExerciseId = s.nextExerciseId
        s.targetExerciseIndex = s.nextExerciseIndex
        s.targetSetIndex = s.nextSetIndex
      } else {
        s.hasTarget = false
        s.canComplete = false
        s.detail = "All sets done"
        s.setNumber = 0
        s.setCount = 0
      }
      s.hasNext = false
    case "skipRest":
      guard s.setStart == nil, s.restEnd != nil else { return }
      s.restStart = nil
      s.restEnd = nil
      s.restOver = false
    case "cancelSet":
      guard matches, s.setStart != nil else { return }
      s.setStart = nil
    default:
      return
    }
    await activity.update(ActivityContent(state: s, staleDate: stale))
  }
}
