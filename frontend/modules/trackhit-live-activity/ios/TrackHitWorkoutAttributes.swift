import ActivityKit
import Foundation

// IMPORTANT: this type must stay byte-for-byte identical (name + fields) to
// targets/widget/TrackHitWorkoutAttributes.swift. ActivityKit matches the
// app's activity with the widget extension's UI by type name and Codable shape.
struct TrackHitWorkoutAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    // All times are seconds since 1970.
    var workoutStart: Double
    var restStart: Double?
    var restEnd: Double?
    var restOver: Bool
    var exerciseName: String
    var nextSet: String
    var setsDone: Int
    var setsTotal: Int
  }

  var workoutId: String
  var workoutName: String
}
