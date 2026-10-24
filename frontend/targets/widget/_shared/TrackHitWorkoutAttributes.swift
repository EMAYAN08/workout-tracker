import ActivityKit
import Foundation

// IMPORTANT: keep identical (name + fields) to
// modules/trackhit-live-activity/ios/TrackHitWorkoutAttributes.swift.
// ActivityKit matches app <-> widget by type name and Codable shape.
// This file is linked into BOTH the app target and the widget (via _shared).
struct TrackHitWorkoutAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // Times are seconds since 1970.
    var workoutStart: Double
    var restStart: Double?
    var restEnd: Double?
    var restOver: Bool
    var setStart: Double?
    var restTargetSec: Double

    // The set the primary button acts on (next set, or the set in progress).
    var hasTarget: Bool
    var canComplete: Bool
    var exerciseName: String
    var detail: String
    var setNumber: Int
    var setCount: Int
    var targetExerciseId: String
    var targetExerciseIndex: Int
    var targetSetIndex: Int

    // What becomes the target once the current target is completed
    // (lets the lock-screen button give instant feedback without the app).
    var hasNext: Bool
    var nextCanComplete: Bool
    var nextExerciseName: String
    var nextDetail: String
    var nextSetNumber: Int
    var nextSetCount: Int
    var nextExerciseId: String
    var nextExerciseIndex: Int
    var nextSetIndex: Int
  }

  var workoutId: String
  var workoutName: String
}
