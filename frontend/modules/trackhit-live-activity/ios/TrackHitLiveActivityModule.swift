import ActivityKit
import ExpoModulesCore
import Foundation
import WidgetKit

private let moduleAppGroupId = "group.com.trackhit.app"
private let moduleActionKeyPrefix = "trackhit.action."
private let moduleWidgetDataKey = "trackhit.widget.consistency"
private let moduleWidgetKind = "TrackHitConsistency"
private let moduleActionNotification = Notification.Name("TrackHitLiveActivityAction")

public class TrackHitLiveActivityModule: Module {
  private var actionObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("TrackHitLiveActivity")

    Events("onAction")

    OnStartObserving {
      if self.actionObserver != nil { return }
      self.actionObserver = NotificationCenter.default.addObserver(
        forName: moduleActionNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.sendEvent("onAction", [:])
      }
    }

    OnStopObserving {
      if let observer = self.actionObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      self.actionObserver = nil
    }

    Function("areActivitiesEnabled") { () -> Bool in
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    // Stores the home screen consistency widget snapshot (JSON) in the App
    // Group and asks WidgetKit to reload that widget's timeline.
    Function("setWidgetData") { (json: String) -> Bool in
      guard let defaults = UserDefaults(suiteName: moduleAppGroupId) else { return false }
      defaults.set(json, forKey: moduleWidgetDataKey)
      WidgetCenter.shared.reloadTimelines(ofKind: moduleWidgetKind)
      return true
    }

    // Returns queued lock-screen button actions as a JSON array and removes them.
    Function("consumePendingActions") { () -> String in
      let defaults = UserDefaults(suiteName: moduleAppGroupId) ?? UserDefaults.standard
      var items: [String] = []
      for (key, value) in defaults.dictionaryRepresentation() where key.hasPrefix(moduleActionKeyPrefix) {
        if let json = value as? String {
          items.append(json)
        }
        defaults.removeObject(forKey: key)
      }
      return "[" + items.joined(separator: ",") + "]"
    }

    // Creates the activity for `workoutId`, or updates the existing one.
    // Any other TrackHit activity is ended so there is only ever one.
    // Returns the activity id, or "" when Live Activities are disabled.
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
