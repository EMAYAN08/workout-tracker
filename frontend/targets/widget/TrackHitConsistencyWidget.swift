import SwiftUI
import WidgetKit

// Home screen widget: the app's Consistency map (Dashboard > Consistency).
// Data comes from the app via the App Group (see src/widgetSnapshot.js):
//   UserDefaults(suiteName: "group.com.trackhit.app")["trackhit.widget.consistency"] = JSON
// The widget derives today/future cells and Score/Days itself so it stays
// correct after midnight without the app running.

private let consistencyAppGroupId = "group.com.trackhit.app"
private let consistencyDataKey = "trackhit.widget.consistency"
let trackHitConsistencyKind = "TrackHitConsistency"

// MARK: - Snapshot

struct ConsistencyColors: Codable {
  var background: String
  var border: String
  var text: String
  var textMuted: String
  var textSubtle: String
  var empty: String
  var rest: String
  var work: String
  var future: String

  static let fallback = ConsistencyColors(
    background: "#111111", border: "#2A2A2A", text: "#F4F4F2",
    textMuted: "#9A9A96", textSubtle: "#6A6A66", empty: "#1C1C1C",
    rest: "#3A3A3A", work: "#C8C4C0", future: "#070707"
  )
}

struct ConsistencySnapshot: Codable {
  var v: Int
  var startDate: String
  var endDate: String
  var days: String
  var hasData: Bool
  var totalWorkouts: Int
  var score: Int
  var activeDays: Int
  var streak: Int
  var colors: ConsistencyColors
}

enum ConsistencyDay {
  case empty, work, rest, future
}

enum ConsistencyStore {
  static func load() -> ConsistencySnapshot? {
    guard
      let defaults = UserDefaults(suiteName: consistencyAppGroupId),
      let json = defaults.string(forKey: consistencyDataKey),
      let snap = try? JSONDecoder().decode(ConsistencySnapshot.self, from: Data(json.utf8))
    else { return nil }
    return snap
  }

  static var calendar: Calendar {
    var cal = Calendar.current
    cal.firstWeekday = 2 // Monday, like the app
    return cal
  }

  static func parseDay(_ s: String) -> Date? {
    let parts = s.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
  }
}

/// Resolves day states for any date relative to `today`.
struct ConsistencyModel {
  let snapshot: ConsistencySnapshot?
  let today: Date
  private let start: Date?
  private let codes: [Character]
  private let cal = ConsistencyStore.calendar

  init(snapshot: ConsistencySnapshot?, now: Date) {
    self.snapshot = snapshot
    self.today = ConsistencyStore.calendar.startOfDay(for: now)
    self.start = snapshot.flatMap { ConsistencyStore.parseDay($0.startDate) }
    self.codes = Array(snapshot?.days ?? "")
  }

  var colors: ConsistencyColors { snapshot?.colors ?? .fallback }
  var hasData: Bool { snapshot?.hasData ?? false }

  func day(_ date: Date) -> ConsistencyDay {
    let d = cal.startOfDay(for: date)
    if d > today { return .future }
    guard let start = start,
          let idx = cal.dateComponents([.day], from: start, to: d).day,
          idx >= 0, idx < codes.count
    else { return .empty }
    switch codes[idx] {
    case "1": return .work
    case "2": return .rest
    default: return .empty
    }
  }

  /// Columns (Mon-first weeks) ending with the week that contains today.
  /// `endingWeeksAgo` shifts the window back (used by the two-row large layout).
  func weeks(_ count: Int, endingWeeksAgo: Int = 0) -> [[Date]] {
    let weekday = cal.component(.weekday, from: today) // Sun=1 … Sat=7
    let offset = (weekday + 5) % 7 // Mon=0 … Sun=6
    guard let monday = cal.date(byAdding: .day, value: -offset - 7 * endingWeeksAgo, to: today) else { return [] }
    return (0..<count).map { w in
      let first = cal.date(byAdding: .day, value: -7 * (count - 1 - w), to: monday) ?? monday
      return (0..<7).map { cal.date(byAdding: .day, value: $0, to: first) ?? first }
    }
  }

  /// Same as the in-app map at offset 0: previous + current month up to today.
  var stats: (score: Int, days: Int) {
    let comps = cal.dateComponents([.year, .month], from: today)
    guard let thisMonth = cal.date(from: comps),
          var d = cal.date(byAdding: .month, value: -1, to: thisMonth) else { return (0, 0) }
    var active = 0
    var valid = 0
    while d <= today {
      let s = day(d)
      if s != .rest { valid += 1 }
      if s == .work { active += 1 }
      guard let next = cal.date(byAdding: .day, value: 1, to: d) else { break }
      d = next
    }
    return (min(Int((Double(active) / Double(max(valid, 1)) * 100).rounded()), 100), active)
  }

  var streak: Int {
    var d = today
    if day(d) != .work, let y = cal.date(byAdding: .day, value: -1, to: d) { d = y }
    var n = 0
    for _ in 0..<400 {
      let s = day(d)
      if s == .work { n += 1 } else if s != .rest { break }
      guard let prev = cal.date(byAdding: .day, value: -1, to: d) else { break }
      d = prev
    }
    return n
  }

  func color(_ s: ConsistencyDay) -> Color {
    switch s {
    case .work: return Color(trackHitHex: colors.work)
    case .rest: return Color(trackHitHex: colors.rest)
    case .future: return Color(trackHitHex: colors.future)
    case .empty: return Color(trackHitHex: colors.empty)
    }
  }
}

extension Color {
  init(trackHitHex hex: String) {
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    self.init(
      .sRGB,
      red: Double((v >> 16) & 0xFF) / 255,
      green: Double((v >> 8) & 0xFF) / 255,
      blue: Double(v & 0xFF) / 255,
      opacity: 1
    )
  }
}

// MARK: - Timeline

struct ConsistencyEntry: TimelineEntry {
  let date: Date
  let snapshot: ConsistencySnapshot?
}

struct ConsistencyProvider: TimelineProvider {
  func placeholder(in context: Context) -> ConsistencyEntry {
    ConsistencyEntry(date: Date(), snapshot: ConsistencyProvider.sample())
  }

  func getSnapshot(in context: Context, completion: @escaping (ConsistencyEntry) -> Void) {
    let snap = ConsistencyStore.load()
    // Widget gallery: show a populated sample if the user has no data yet.
    completion(ConsistencyEntry(date: Date(), snapshot: context.isPreview && !(snap?.hasData ?? false) ? ConsistencyProvider.sample() : snap))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<ConsistencyEntry>) -> Void) {
    let now = Date()
    let cal = ConsistencyStore.calendar
    let snap = ConsistencyStore.load()
    let midnight = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) ?? now.addingTimeInterval(86_400)
    let entries = [
      ConsistencyEntry(date: now, snapshot: snap),
      ConsistencyEntry(date: midnight, snapshot: snap), // day rolls over at midnight
    ]
    completion(Timeline(entries: entries, policy: .after(midnight)))
  }

  static func sample() -> ConsistencySnapshot {
    let cal = ConsistencyStore.calendar
    let today = cal.startOfDay(for: Date())
    let start = cal.date(byAdding: .day, value: -188, to: today) ?? today
    let pattern: [Character] = ["1", "0", "1", "1", "2", "1", "0"]
    let days = String((0...188).map { pattern[$0 % pattern.count] })
    let f = DateFormatter()
    f.calendar = cal
    f.dateFormat = "yyyy-MM-dd"
    return ConsistencySnapshot(
      v: 1, startDate: f.string(from: start), endDate: f.string(from: today), days: days,
      hasData: true, totalWorkouts: 100, score: 0, activeDays: 0, streak: 0, colors: .fallback
    )
  }
}

// MARK: - Views

struct ConsistencyGrid: View {
  let model: ConsistencyModel
  let weeks: Int
  var showWeekdays: Bool = false
  var showMonths: Bool = false
  var endingWeeksAgo: Int = 0

  private let weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"]

  var body: some View {
    GeometryReader { geo in
      let cols = model.weeks(weeks, endingWeeksAgo: endingWeeksAgo)
      let labelW: CGFloat = showWeekdays ? 12 : 0
      let monthH: CGFloat = showMonths ? 14 : 0
      let gap: CGFloat = weeks > 20 ? 3 : 4
      let byW = (geo.size.width - labelW - (showWeekdays ? 4 : 0) - gap * CGFloat(weeks - 1)) / CGFloat(weeks)
      let byH = (geo.size.height - monthH - gap * 6) / 7
      let cell = max(4, floor(min(byW, byH)))
      let radius = max(2, (cell * 0.28).rounded())
      let gridW = cell * CGFloat(weeks) + gap * CGFloat(weeks - 1) + labelW + (showWeekdays ? 4 : 0)

      VStack(alignment: .leading, spacing: 0) {
        if showMonths {
          HStack(spacing: gap) {
            if showWeekdays { Color.clear.frame(width: labelW + 4 - gap, height: monthH) }
            ForEach(0..<cols.count, id: \.self) { i in
              Text(monthLabel(cols, i))
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(Color(trackHitHex: model.colors.textMuted))
                .fixedSize()
                .frame(width: cell, height: monthH, alignment: .leading)
            }
          }
        }
        HStack(alignment: .top, spacing: gap) {
          if showWeekdays {
            VStack(spacing: gap) {
              ForEach(0..<7, id: \.self) { r in
                Text(weekdayLabels[r])
                  .font(.system(size: 8, weight: .semibold))
                  .foregroundColor(Color(trackHitHex: model.colors.textMuted))
                  .frame(width: labelW, height: cell)
              }
            }
            .padding(.trailing, 4 - gap)
          }
          ForEach(0..<cols.count, id: \.self) { c in
            VStack(spacing: gap) {
              ForEach(0..<7, id: \.self) { r in
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                  .fill(model.color(model.day(cols[c][r])))
                  .frame(width: cell, height: cell)
              }
            }
          }
        }
      }
      .frame(width: gridW)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }
  }

  /// Month name above the first column whose Monday falls in a new month.
  private func monthLabel(_ cols: [[Date]], _ i: Int) -> String {
    let cal = ConsistencyStore.calendar
    let m = cal.component(.month, from: cols[i][0])
    if i > 0 && cal.component(.month, from: cols[i - 1][0]) == m { return "" }
    if i == 0 && cal.component(.day, from: cols[i][0]) > 7 { return "" } // partial month at the edge
    let f = DateFormatter()
    f.dateFormat = "MMM"
    return f.string(from: cols[i][0])
  }
}

struct ConsistencyStat: View {
  let value: String
  let label: String
  let colors: ConsistencyColors
  var big: Bool = false

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(value)
        .font(.system(size: big ? 22 : 17, weight: .bold, design: .monospaced))
        .foregroundColor(Color(trackHitHex: colors.text))
        .minimumScaleFactor(0.7)
        .lineLimit(1)
      Text(label.uppercased())
        .font(.system(size: 8, weight: .semibold))
        .kerning(0.8)
        .foregroundColor(Color(trackHitHex: colors.textSubtle))
    }
  }
}

struct ConsistencyTitle: View {
  let colors: ConsistencyColors
  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: "flame.fill")
        .font(.system(size: 10, weight: .semibold))
      Text("CONSISTENCY")
        .font(.system(size: 10, weight: .semibold))
        .kerning(0.8)
    }
    .foregroundColor(Color(trackHitHex: colors.textSubtle))
  }
}

struct ConsistencyEmptyView: View {
  let colors: ConsistencyColors
  let compact: Bool
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      ConsistencyTitle(colors: colors)
      Spacer(minLength: 0)
      Text("No workouts yet")
        .font(.system(size: compact ? 14 : 16, weight: .semibold))
        .foregroundColor(Color(trackHitHex: colors.text))
      Text("Log a workout in TrackHit to start your map.")
        .font(.system(size: 11))
        .foregroundColor(Color(trackHitHex: colors.textMuted))
        .lineLimit(3)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct ConsistencyWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: ConsistencyEntry

  var body: some View {
    let model = ConsistencyModel(snapshot: entry.snapshot, now: entry.date)
    let colors = model.colors
    content(model)
      .widgetURL(URL(string: "trackit://"))
      .trackHitWidgetBackground(Color(trackHitHex: colors.background))
  }

  @ViewBuilder
  private func content(_ model: ConsistencyModel) -> some View {
    let colors = model.colors
    if !model.hasData {
      ConsistencyEmptyView(colors: colors, compact: family == .systemSmall)
    } else {
      let s = model.stats
      switch family {
      case .systemMedium:
        HStack(alignment: .center, spacing: 12) {
          VStack(alignment: .leading, spacing: 8) {
            ConsistencyTitle(colors: colors)
            ConsistencyStat(value: "\(s.score)%", label: "Score", colors: colors, big: true)
            ConsistencyStat(value: "\(s.days)", label: "Days", colors: colors)
          }
          .frame(width: 84, alignment: .leading)
          ConsistencyGrid(model: model, weeks: 17, showMonths: true)
        }
      case .systemLarge:
        VStack(alignment: .leading, spacing: 10) {
          ConsistencyTitle(colors: colors)
          HStack(spacing: 18) {
            ConsistencyStat(value: "\(s.score)%", label: "Score", colors: colors, big: true)
            Rectangle().fill(Color(trackHitHex: colors.border)).frame(width: 1, height: 28)
            ConsistencyStat(value: "\(s.days)", label: "Days", colors: colors, big: true)
            Rectangle().fill(Color(trackHitHex: colors.border)).frame(width: 1, height: 28)
            ConsistencyStat(value: "\(model.streak)", label: "Day streak", colors: colors, big: true)
          }
          Rectangle().fill(Color(trackHitHex: colors.border)).frame(height: 1)
          // 26 weeks as two rows of 13 so the cells fill the large widget.
          ConsistencyGrid(model: model, weeks: 13, showWeekdays: true, showMonths: true, endingWeeksAgo: 13)
          ConsistencyGrid(model: model, weeks: 13, showWeekdays: true, showMonths: true)
          ConsistencyLegend(model: model)
        }
      default:
        VStack(alignment: .leading, spacing: 8) {
          HStack(alignment: .firstTextBaseline) {
            ConsistencyTitle(colors: colors)
            Spacer(minLength: 0)
          }
          HStack(alignment: .lastTextBaseline, spacing: 6) {
            Text("\(s.score)%")
              .font(.system(size: 20, weight: .bold, design: .monospaced))
              .foregroundColor(Color(trackHitHex: colors.text))
            Text("\(s.days) days")
              .font(.system(size: 10, weight: .semibold))
              .foregroundColor(Color(trackHitHex: colors.textSubtle))
          }
          ConsistencyGrid(model: model, weeks: 8)
        }
      }
    }
  }
}

struct ConsistencyLegend: View {
  let model: ConsistencyModel
  var body: some View {
    HStack(spacing: 12) {
      item(.work, "Workout")
      item(.rest, "Rest")
      item(.empty, "Missed")
      Spacer(minLength: 0)
    }
  }

  private func item(_ d: ConsistencyDay, _ label: String) -> some View {
    HStack(spacing: 4) {
      RoundedRectangle(cornerRadius: 2, style: .continuous).fill(model.color(d)).frame(width: 9, height: 9)
      Text(label)
        .font(.system(size: 9, weight: .medium))
        .foregroundColor(Color(trackHitHex: model.colors.textMuted))
    }
  }
}

extension View {
  /// iOS 17 requires containerBackground; earlier versions paint a background
  /// and pad manually (no automatic content margins before iOS 17).
  @ViewBuilder
  func trackHitWidgetBackground(_ color: Color) -> some View {
    if #available(iOS 17.0, *) {
      self.containerBackground(for: .widget) { color }
    } else {
      self.padding(16).background(color)
    }
  }
}

struct TrackHitConsistencyWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: trackHitConsistencyKind, provider: ConsistencyProvider()) { entry in
      ConsistencyWidgetView(entry: entry)
    }
    .configurationDisplayName("Consistency")
    .description("Your TrackHit consistency map.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
