import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

@main
struct TrackHitWidgetBundle: WidgetBundle {
  var body: some Widget {
    TrackHitWorkoutLiveActivity()
    TrackHitConsistencyWidget()
  }
}

// MARK: - State

enum TrackHitPhase {
  case inSet
  case resting
  case restOver
  case idle
  case done

  var accent: Color {
    switch self {
    case .inSet: return Color(red: 1.0, green: 0.27, blue: 0.23)
    case .resting: return Color(red: 0.22, green: 0.62, blue: 1.0)
    case .restOver: return Color(red: 0.20, green: 0.84, blue: 0.40)
    case .idle: return Color(white: 0.55)
    case .done: return Color(red: 0.20, green: 0.84, blue: 0.40)
    }
  }

  var symbol: String {
    switch self {
    case .inSet: return "figure.strengthtraining.traditional"
    case .resting: return "timer"
    case .restOver: return "checkmark.circle.fill"
    case .idle: return "dumbbell.fill"
    case .done: return "flag.checkered"
    }
  }
}

extension TrackHitWorkoutAttributes.ContentState {
  var workoutStartDate: Date { Date(timeIntervalSince1970: workoutStart) }
  var setStartDate: Date? { setStart.map { Date(timeIntervalSince1970: $0) } }

  var restRange: ClosedRange<Date>? {
    guard let s = restStart, let e = restEnd else { return nil }
    let start = Date(timeIntervalSince1970: s)
    let end = Date(timeIntervalSince1970: max(e, s + 1))
    return start...end
  }

  /// `isStale` turns true when iOS passes the staleDate (= rest end), so the
  /// "rest over" look appears even while the app is suspended.
  func phase(isStale: Bool) -> TrackHitPhase {
    if setStart != nil { return .inSet }
    if let range = restRange {
      if restOver || isStale || Date() >= range.upperBound { return .restOver }
      return .resting
    }
    return hasTarget ? .idle : .done
  }
}

// MARK: - Pieces

/// Big white timer in the inner pill.
struct MainTimerText: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var size: CGFloat = 28

  var body: some View {
    Group {
      if phase == .resting, let range = state.restRange {
        Text(timerInterval: range, countsDown: true)
      } else if phase == .inSet, let start = state.setStartDate {
        Text(start, style: .timer)
      } else if phase == .restOver {
        Text("0:00")
      } else {
        Text(state.workoutStartDate, style: .timer)
      }
    }
    .font(.system(size: size, weight: .semibold, design: .rounded))
    .monospacedDigit()
    .foregroundColor(.white)
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }
}

/// Small header timer: workout elapsed with a clock glyph.
struct WorkoutClock: View {
  let state: TrackHitWorkoutAttributes.ContentState
  var body: some View {
    HStack(spacing: 4) {
      Text(state.workoutStartDate, style: .timer)
        .font(.system(.subheadline, design: .rounded).weight(.semibold))
        .monospacedDigit()
        .foregroundColor(.white)
        .multilineTextAlignment(.trailing)
        .frame(maxWidth: 70, alignment: .trailing)
      Image(systemName: "clock.fill")
        .font(.caption)
        .foregroundColor(Color(white: 0.6))
    }
  }
}

/// Right side of the inner pill: "Rest" / "Go" capsule, or "Set N" with
/// small position pills either side.
struct StatusCapsule: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase

  var body: some View {
    switch phase {
    case .resting:
      label("Rest", fg: .white, bg: phase.accent)
    case .restOver:
      label("Go", fg: .black, bg: phase.accent)
    case .done:
      label("All sets done", fg: .white, bg: Color(white: 0.25))
    case .inSet, .idle:
      HStack(spacing: 4) {
        ForEach(0..<min(max(state.setNumber - 1, 0), 3), id: \.self) { _ in
          Capsule().fill(Color.white).frame(width: 12, height: 14)
        }
        label(
          state.setNumber > 0 ? "Set \(state.setNumber)" : "Ready",
          fg: phase == .inSet ? .black : .white,
          bg: phase == .inSet ? Color.white : Color(white: 0.32)
        )
        ForEach(0..<min(max(state.setCount - state.setNumber, 0), 3), id: \.self) { _ in
          Capsule().fill(Color(white: 0.4)).frame(width: 12, height: 14)
        }
      }
    }
  }

  private func label(_ text: String, fg: Color, bg: Color) -> some View {
    Text(text)
      .font(.system(.subheadline, design: .rounded).weight(.semibold))
      .foregroundColor(fg)
      .lineLimit(1)
      .frame(maxWidth: .infinity)
      .padding(.vertical, 5)
      .background(Capsule().fill(bg))
  }
}

struct InnerPill: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var body: some View {
    HStack(spacing: 10) {
      MainTimerText(state: state, phase: phase)
        .frame(width: 78, alignment: .leading)
      StatusCapsule(state: state, phase: phase)
    }
    .padding(.horizontal, 12)
    .padding(.vertical, 8)
    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(Color(white: 0.16)))
  }
}

struct ExerciseRow: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  let workoutId: String

  var body: some View {
    HStack(spacing: 10) {
      VStack(spacing: 3) {
        Capsule()
          .fill(Color.white)
          .frame(width: 4, height: 16)
        Capsule()
          .fill(Color(white: 0.35))
          .frame(width: 4, height: 8)
      }
      VStack(alignment: .leading, spacing: 1) {
        Text(state.exerciseName)
          .font(.headline)
          .foregroundColor(.white)
          .lineLimit(1)
        Text(state.detail)
          .font(.subheadline)
          .foregroundColor(Color(white: 0.6))
          .lineLimit(1)
      }
      Spacer(minLength: 6)
      ActionButtons(state: state, phase: phase, workoutId: workoutId)
    }
  }
}

/// Interactive buttons on iOS 17+; nothing on 16.x.
struct ActionButtons: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  let workoutId: String

  var body: some View {
    if #available(iOS 17.0, *) {
      ActionButtons17(state: state, phase: phase, workoutId: workoutId)
    }
  }
}

@available(iOS 17.0, *)
struct ActionButtons17: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  let workoutId: String

  private func intent(_ action: String) -> TrackHitSetActionIntent {
    TrackHitSetActionIntent(
      action: action,
      workoutId: workoutId,
      exerciseId: state.targetExerciseId,
      exerciseIndex: state.targetExerciseIndex,
      setIndex: state.targetSetIndex
    )
  }

  var body: some View {
    HStack(spacing: 8) {
      if phase == .resting || phase == .restOver {
        Button(intent: intent("skipRest")) {
          Image(systemName: "forward.end.fill")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 40, height: 40)
            .background(Circle().fill(Color(white: 0.22)))
        }
        .buttonStyle(.plain)
      } else if phase == .inSet {
        Button(intent: intent("cancelSet")) {
          Image(systemName: "xmark")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(.white)
            .frame(width: 40, height: 40)
            .background(Circle().fill(Color(white: 0.22)))
        }
        .buttonStyle(.plain)
      }

      if state.hasTarget && (phase != .inSet || state.canComplete) {
        Button(intent: intent(phase == .inSet ? "complete" : "start")) {
          Image(systemName: phase == .inSet ? "checkmark" : "play.fill")
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.black)
            .frame(width: 64, height: 40)
            .background(Capsule().fill(Color.white))
        }
        .buttonStyle(.plain)
      }
    }
  }
}

// MARK: - Lock screen

struct TrackHitLockScreenView: View {
  let context: ActivityViewContext<TrackHitWorkoutAttributes>

  var body: some View {
    let state = context.state
    let phase = state.phase(isStale: context.isStale)

    VStack(spacing: 10) {
      HStack {
        Text(context.attributes.workoutName)
          .font(.subheadline.weight(.semibold))
          .foregroundColor(Color(white: 0.75))
          .lineLimit(1)
        Spacer(minLength: 8)
        WorkoutClock(state: state)
      }
      InnerPill(state: state, phase: phase)
      ExerciseRow(state: state, phase: phase, workoutId: context.attributes.workoutId)
    }
    .padding(.horizontal, 14)
    .padding(.vertical, 12)
    .overlay(
      ContainerRelativeShape()
        .strokeBorder(phase.accent.opacity(0.85), lineWidth: 1.5)
        .shadow(color: phase.accent.opacity(0.8), radius: 6)
    )
  }
}

// MARK: - Widget

struct TrackHitWorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TrackHitWorkoutAttributes.self) { context in
      let phase = context.state.phase(isStale: context.isStale)
      TrackHitLockScreenView(context: context)
        .activityBackgroundTint(Color.black)
        .activitySystemActionForegroundColor(phase.accent)
    } dynamicIsland: { context in
      let state = context.state
      let phase = state.phase(isStale: context.isStale)

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.attributes.workoutName)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(Color(white: 0.75))
            .lineLimit(1)
            .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          WorkoutClock(state: state)
            .padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 8) {
            InnerPill(state: state, phase: phase)
            ExerciseRow(state: state, phase: phase, workoutId: context.attributes.workoutId)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: phase.symbol)
          .foregroundColor(phase.accent)
      } compactTrailing: {
        Group {
          if phase == .resting, let range = state.restRange {
            Text(timerInterval: range, countsDown: true)
          } else if phase == .inSet, let start = state.setStartDate {
            Text(start, style: .timer)
          } else {
            Text(state.workoutStartDate, style: .timer)
          }
        }
        .font(.system(.body, design: .rounded).weight(.semibold))
        .monospacedDigit()
        .foregroundColor(phase == .idle || phase == .done ? .white : phase.accent)
        .frame(maxWidth: 46)
      } minimal: {
        if phase == .resting, let range = state.restRange {
          ProgressView(timerInterval: range, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
            .progressViewStyle(.circular)
            .tint(phase.accent)
        } else {
          Image(systemName: phase.symbol)
            .foregroundColor(phase.accent)
        }
      }
      .widgetURL(URL(string: "trackit://"))
      .keylineTint(phase.accent)
    }
  }
}
