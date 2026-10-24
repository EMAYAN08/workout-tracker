import ActivityKit
import SwiftUI
import WidgetKit

@main
struct TrackHitWidgetBundle: WidgetBundle {
  var body: some Widget {
    TrackHitWorkoutLiveActivity()
  }
}

// MARK: - Phase / style

enum TrackHitPhase {
  case working
  case resting
  case restOver

  var accent: Color {
    switch self {
    case .working: return Color(red: 0.31, green: 0.55, blue: 1.0)   // brand blue
    case .resting: return Color(red: 1.0, green: 0.62, blue: 0.04)   // amber
    case .restOver: return Color(red: 0.19, green: 0.82, blue: 0.35) // green
    }
  }

  var accentDeep: Color {
    switch self {
    case .working: return Color(red: 0.45, green: 0.30, blue: 1.0)
    case .resting: return Color(red: 1.0, green: 0.38, blue: 0.12)
    case .restOver: return Color(red: 0.10, green: 0.70, blue: 0.62)
    }
  }

  var symbol: String {
    switch self {
    case .working: return "figure.strengthtraining.traditional"
    case .resting: return "timer"
    case .restOver: return "checkmark.circle.fill"
    }
  }

  var label: String {
    switch self {
    case .working: return "WORKING OUT"
    case .resting: return "RESTING"
    case .restOver: return "REST OVER · GO!"
    }
  }

  var gradient: LinearGradient {
    LinearGradient(colors: [accent, accentDeep], startPoint: .leading, endPoint: .trailing)
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

  /// `isStale` flips to true when the system passes the staleDate (= rest end)
  /// set by the app, so the colour switches even while the app is suspended.
  func phase(isStale: Bool) -> TrackHitPhase {
    guard let range = restRange else { return .working }
    if restOver || isStale || Date() >= range.upperBound { return .restOver }
    return .resting
  }
}

// MARK: - Building blocks

/// Pulses the symbol on iOS 17+, plain image on 16.x.
struct PhaseSymbol: View {
  let phase: TrackHitPhase
  var body: some View {
    if #available(iOS 17.0, *) {
      Image(systemName: phase.symbol)
        .foregroundStyle(phase.accent)
        .symbolEffect(.pulse, options: .repeating, isActive: phase != .working)
    } else {
      Image(systemName: phase.symbol)
        .foregroundColor(phase.accent)
    }
  }
}

struct PhaseBadge: View {
  let phase: TrackHitPhase
  var size: CGFloat = 34
  var body: some View {
    ZStack {
      Circle()
        .fill(phase.accent.opacity(0.22))
      Circle()
        .strokeBorder(phase.accent.opacity(0.55), lineWidth: 1)
      PhaseSymbol(phase: phase)
        .font(.system(size: size * 0.48, weight: .bold))
    }
    .frame(width: size, height: size)
  }
}

struct ElapsedLabel: View {
  let state: TrackHitWorkoutAttributes.ContentState
  var body: some View {
    HStack(spacing: 3) {
      Image(systemName: "stopwatch")
        .font(.caption2.weight(.bold))
      Text(state.workoutStartDate, style: .timer)
        .font(.system(.footnote, design: .rounded).weight(.semibold))
        .monospacedDigit()
        .frame(maxWidth: 64, alignment: .leading)
    }
  }
}

struct BigRestValue: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var size: CGFloat
  var body: some View {
    Group {
      if phase == .resting, let range = state.restRange {
        Text(timerInterval: range, countsDown: true)
          .monospacedDigit()
      } else if phase == .restOver {
        Text("GO")
      } else {
        Text(state.workoutStartDate, style: .timer)
          .monospacedDigit()
      }
    }
    .font(.system(size: size, weight: .heavy, design: .rounded))
    .foregroundStyle(phase.gradient)
    .contentTransition(.numericText(countsDown: phase == .resting))
    .multilineTextAlignment(.trailing)
    .lineLimit(1)
    .minimumScaleFactor(0.6)
  }
}

/// Rounded, glowing rest bar. Only shown for rest (never set progress).
struct RestCapsuleBar: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var height: CGFloat = 8
  var body: some View {
    if phase == .resting, let range = state.restRange {
      ProgressView(timerInterval: range, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
        .progressViewStyle(.linear)
        .tint(phase.accent)
        .scaleEffect(x: 1, y: height / 4, anchor: .center)
        .frame(height: height)
        .clipShape(Capsule())
        .shadow(color: phase.accent.opacity(0.6), radius: 4)
    } else if phase == .restOver {
      Capsule()
        .fill(phase.gradient)
        .frame(height: height)
        .shadow(color: phase.accent.opacity(0.6), radius: 4)
    }
  }
}

struct NextSetChip: View {
  let text: String
  let phase: TrackHitPhase
  var body: some View {
    Text(text)
      .font(.caption.weight(.semibold))
      .lineLimit(1)
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(Capsule().fill(phase.accent.opacity(0.18)))
      .overlay(Capsule().strokeBorder(phase.accent.opacity(0.4), lineWidth: 0.5))
  }
}

struct RestRing: View {
  let state: TrackHitWorkoutAttributes.ContentState
  let phase: TrackHitPhase
  var body: some View {
    if phase == .resting, let range = state.restRange {
      ProgressView(timerInterval: range, countsDown: true, label: { EmptyView() }, currentValueLabel: { EmptyView() })
        .progressViewStyle(.circular)
        .tint(phase.accent)
    } else {
      PhaseSymbol(phase: phase)
    }
  }
}

// MARK: - Lock screen

struct TrackHitLockScreenView: View {
  let context: ActivityViewContext<TrackHitWorkoutAttributes>

  var body: some View {
    let state = context.state
    let phase = state.phase(isStale: context.isStale)

    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center, spacing: 10) {
        PhaseBadge(phase: phase)
        VStack(alignment: .leading, spacing: 1) {
          Text(phase.label)
            .font(.caption2.weight(.heavy))
            .tracking(0.8)
            .foregroundColor(phase.accent)
            .contentTransition(.numericText())
          Text(context.attributes.workoutName)
            .font(.subheadline.weight(.semibold))
            .foregroundColor(.primary)
            .lineLimit(1)
        }
        Spacer(minLength: 6)
        ElapsedLabel(state: state)
          .foregroundColor(.secondary)
      }

      HStack(alignment: .center, spacing: 8) {
        VStack(alignment: .leading, spacing: 5) {
          Text(state.exerciseName)
            .font(.title3.weight(.bold))
            .foregroundColor(.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
          NextSetChip(text: state.nextSet, phase: phase)
            .foregroundColor(.primary)
        }
        Spacer(minLength: 6)
        BigRestValue(state: state, phase: phase, size: phase == .working ? 30 : 42)
          .frame(maxWidth: 130, alignment: .trailing)
      }

      RestCapsuleBar(state: state, phase: phase)
    }
    .padding(16)
    .background(
      LinearGradient(
        colors: [phase.accent.opacity(0.28), phase.accentDeep.opacity(0.06)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
  }
}

// MARK: - Widget

struct TrackHitWorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: TrackHitWorkoutAttributes.self) { context in
      let phase = context.state.phase(isStale: context.isStale)
      TrackHitLockScreenView(context: context)
        .activityBackgroundTint(phase.accent.opacity(0.10))
        .activitySystemActionForegroundColor(phase.accent)
    } dynamicIsland: { context in
      let state = context.state
      let phase = state.phase(isStale: context.isStale)

      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 8) {
            PhaseBadge(phase: phase, size: 36)
            VStack(alignment: .leading, spacing: 1) {
              Text(phase == .restOver ? "GO!" : (phase == .resting ? "REST" : "LIFT"))
                .font(.caption2.weight(.heavy))
                .foregroundColor(phase.accent)
              ElapsedLabel(state: state)
                .foregroundColor(.white)
            }
          }
          .padding(.leading, 2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          BigRestValue(state: state, phase: phase, size: phase == .working ? 22 : 30)
            .frame(maxWidth: 96, alignment: .trailing)
            .padding(.trailing, 2)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.workoutName)
            .font(.caption.weight(.semibold))
            .foregroundColor(.gray)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
              Text(state.exerciseName)
                .font(.headline)
                .foregroundColor(.white)
                .lineLimit(1)
              Spacer(minLength: 4)
              NextSetChip(text: state.nextSet, phase: phase)
                .foregroundColor(.white)
            }
            RestCapsuleBar(state: state, phase: phase, height: 6)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        if phase == .resting {
          RestRing(state: state, phase: phase)
            .frame(width: 20, height: 20)
        } else {
          PhaseSymbol(phase: phase)
        }
      } compactTrailing: {
        if phase == .resting, let range = state.restRange {
          Text(timerInterval: range, countsDown: true)
            .monospacedDigit()
            .font(.system(.body, design: .rounded).weight(.bold))
            .foregroundColor(phase.accent)
            .frame(maxWidth: 42)
        } else if phase == .restOver {
          Image(systemName: "checkmark.circle.fill")
            .foregroundColor(phase.accent)
        } else {
          Text(state.workoutStartDate, style: .timer)
            .monospacedDigit()
            .font(.system(.body, design: .rounded).weight(.semibold))
            .foregroundColor(.white)
            .frame(maxWidth: 46)
        }
      } minimal: {
        RestRing(state: state, phase: phase)
      }
      .widgetURL(URL(string: "trackit://"))
      .keylineTint(phase.accent)
    }
  }
}
