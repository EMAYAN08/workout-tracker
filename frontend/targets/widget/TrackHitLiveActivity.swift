import ActivityKit
import SwiftUI
import WidgetKit

@main
struct TrackHitWidgetBundle: WidgetBundle {
  var body: some Widget {
    TrackHitWorkoutLiveActivity()
  }
}

// MARK: - Phase / colours

enum TrackHitPhase {
  case working
  case resting
  case restOver
}

struct TrackHitPalette {
  static let resting = Color(red: 1.0, green: 0.62, blue: 0.04)   // orange
  static let restOver = Color(red: 0.19, green: 0.82, blue: 0.35) // green
  static let working = Color(red: 0.04, green: 0.52, blue: 1.0)   // blue

  static func accent(_ phase: TrackHitPhase) -> Color {
    switch phase {
    case .working: return working
    case .resting: return resting
    case .restOver: return restOver
    }
  }
}

extension TrackHitWorkoutAttributes.ContentState {
  var workoutStartDate: Date { Date(timeIntervalSince1970: workoutStart) }

  /// Rest interval with a guaranteed non-empty range.
  var restRange: ClosedRange<Date>? {
    guard let s = restStart, let e = restEnd else { return nil }
    let start = Date(timeIntervalSince1970: s)
    let end = Date(timeIntervalSince1970: max(e, s + 1))
    return start...end
  }

  /// `isStale` flips to true when the system passes the staleDate we set to
  /// the rest end, so the colour changes even while the app is suspended.
  func phase(isStale: Bool) -> TrackHitPhase {
    guard let range = restRange else { return .working }
    if restOver || isStale || Date() >= range.upperBound { return .restOver }
    return .resting
  }

  var setsText: String { "\(setsDone)/\(setsTotal)" }
}

// MARK: - Small pieces

struct WorkoutTimerText: View {
  let state: TrackHitWorkoutAttributes.ContentState
  var body: some View {
    Text(state.workoutStartDate, style: .timer)
      .monospacedDigit()
  }
}

struct RestCountdownText: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var body: some View {
    if phase == .resting, let range = state.restRange {
      Text(timerInterval: range, countsDown: true)
        .monospacedDigit()
    } else if phase == .restOver {
      Text("Rest over")
    } else {
      Text(state.setsText)
        .monospacedDigit()
    }
  }
}

struct RestBar: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var body: some View {
    if phase == .resting, let range = state.restRange {
      ProgressView(timerInterval: range, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
        .progressViewStyle(.linear)
        .tint(TrackHitPalette.resting)
    } else if phase == .restOver {
      ProgressView(value: 1.0)
        .progressViewStyle(.linear)
        .tint(TrackHitPalette.restOver)
    } else {
      ProgressView(value: Double(state.setsDone), total: Double(max(state.setsTotal, 1)))
        .progressViewStyle(.linear)
        .tint(TrackHitPalette.working)
    }
  }
}

// MARK: - Lock screen

struct TrackHitLockScreenView: View {
  let context: ActivityViewContext<TrackHitWorkoutAttributes>

  var body: some View {
    let state = context.state
    let phase = state.phase(isStale: context.isStale)
    let accent = TrackHitPalette.accent(phase)

    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center) {
        Image(systemName: "dumbbell.fill")
          .foregroundColor(accent)
        Text(context.attributes.workoutName)
          .font(.headline)
          .lineLimit(1)
        Spacer(minLength: 8)
        WorkoutTimerText(state: state)
          .font(.headline)
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 90, alignment: .trailing)
      }

      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 2) {
          Text(phase == .working ? "Up next" : (phase == .resting ? "Resting · next up" : "Rest over · go!"))
            .font(.caption)
            .foregroundColor(phase == .working ? .secondary : accent)
          Text(state.exerciseName)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
          Text(state.nextSet)
            .font(.caption)
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
        Spacer(minLength: 8)
        VStack(alignment: .trailing, spacing: 2) {
          if phase == .working {
            Text("Sets")
              .font(.caption)
              .foregroundColor(.secondary)
          }
          RestCountdownText(state: state, phase: phase)
            .font(.title2.weight(.bold))
            .foregroundColor(phase == .working ? .primary : accent)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 120, alignment: .trailing)
        }
      }

      RestBar(state: state, phase: phase)
    }
    .padding(16)
  }
}

// MARK: - Widget

struct TrackHitWorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TrackHitWorkoutAttributes.self) { context in
      TrackHitLockScreenView(context: context)
        .activitySystemActionForegroundColor(TrackHitPalette.accent(context.state.phase(isStale: context.isStale)))
    } dynamicIsland: { context in
      let state = context.state
      let phase = state.phase(isStale: context.isStale)
      let accent = TrackHitPalette.accent(phase)

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: "dumbbell.fill")
              .foregroundColor(accent)
            WorkoutTimerText(state: state)
              .font(.headline)
              .foregroundColor(.white)
              .frame(maxWidth: 80, alignment: .leading)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          RestCountdownText(state: state, phase: phase)
            .font(.headline)
            .foregroundColor(phase == .working ? .white : accent)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 90, alignment: .trailing)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.workoutName)
            .font(.caption)
            .foregroundColor(.gray)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            HStack {
              Text(state.exerciseName)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(.white)
                .lineLimit(1)
              Spacer(minLength: 6)
              Text("\(state.setsText) sets")
                .font(.caption)
                .foregroundColor(.gray)
                .monospacedDigit()
            }
            Text(phase == .restOver ? "Rest over · \(state.nextSet)" : state.nextSet)
              .font(.caption)
              .foregroundColor(phase == .restOver ? accent : .gray)
              .lineLimit(1)
            RestBar(state: state, phase: phase)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        HStack(spacing: 3) {
          Image(systemName: "dumbbell.fill")
            .foregroundColor(accent)
          WorkoutTimerText(state: state)
            .foregroundColor(.white)
            .frame(maxWidth: 46)
        }
      } compactTrailing: {
        if phase == .resting, let range = state.restRange {
          Text(timerInterval: range, countsDown: true)
            .monospacedDigit()
            .foregroundColor(accent)
            .frame(maxWidth: 40)
        } else if phase == .restOver {
          Image(systemName: "checkmark.circle.fill")
            .foregroundColor(accent)
        } else {
          Text(state.setsText)
            .monospacedDigit()
            .foregroundColor(.white)
        }
      } minimal: {
        if phase == .resting, let range = state.restRange {
          ProgressView(timerInterval: range, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
            .progressViewStyle(.circular)
            .tint(accent)
        } else {
          Image(systemName: phase == .restOver ? "checkmark.circle.fill" : "dumbbell.fill")
            .foregroundColor(accent)
        }
      }
      .widgetURL(URL(string: "trackit://"))
      .keylineTint(accent)
    }
  }
}
