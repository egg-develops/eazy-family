//
//  EazyFamilyWidget.swift
//  EazyFamilyWidget
//

import WidgetKit
import SwiftUI

// MARK: - Brand colours

private let TC     = Color(hex: "#964735")
private let BG     = Color(hex: "#F7F3ED")
private let BORDER = Color(hex: "#DAC1BB")
private let MUTED  = Color(hex: "#7A6660")
private let INK    = Color(hex: "#1C1C18")
private let SAGE   = Color(hex: "#44664F")
private let BLUE   = Color(hex: "#6E8FE5")
private let GOLD   = Color(hex: "#B88A00")

extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var n: UInt64 = 0
        Scanner(string: h).scanHexInt64(&n)
        self.init(
            red:   Double((n >> 16) & 0xFF) / 255,
            green: Double((n >>  8) & 0xFF) / 255,
            blue:  Double( n        & 0xFF) / 255
        )
    }
}

private func accent(for mode: WidgetDisplayMode) -> Color {
    switch mode {
    case .events:    return TC
    case .shopping:  return SAGE
    case .tasks:     return BLUE
    case .reminders: return GOLD
    case .rituals:   return TC
    case .journal:   return TC
    }
}

private extension WidgetDisplayMode {
    var shortStatLabel: String {
        switch self {
        case .events:    return "events"
        case .shopping:  return "items"
        case .tasks:     return "tasks"
        case .reminders: return "reminders"
        case .rituals:   return "rituals"
        case .journal:   return "entries"
        }
    }
}

// MARK: - Widget Definition

struct EazyFamilyWidget: Widget {
    let kind = "EazyFamilyWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: EazyWidgetIntent.self,
            provider: EazyProvider()
        ) { entry in
            EazyWidgetView(entry: entry)
                .containerBackground(BG, for: .widget)
        }
        .configurationDisplayName("Eazy.Family")
        .description("Your family's calendar, tasks, and shopping — always one glance away.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge])
    }
}

// MARK: - Root view

struct EazyWidgetView: View {
    let entry: EazyEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        if !entry.isAuthenticated {
            UnauthenticatedView()
        } else if let data = entry.data {
            switch family {
            case .systemSmall:      SmallWidgetView(data: data, entry: entry)
            case .systemMedium:     MediumWidgetView(data: data, entry: entry)
            case .systemExtraLarge: ExtraLargeWidgetView(data: data, entry: entry)
            default:                LargeWidgetView(data: data, entry: entry)
            }
        } else {
            EmptyStateView(mode: entry.configuration.displayMode.asModel)
        }
    }
}

// MARK: - App icon (replaces the old BrandPanel — looks like a real iOS home-screen icon)

struct AppIconView: View {
    var size: CGFloat = 44

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.224)
                .fill(LinearGradient(
                    colors: [Color(hex: "#964735"), Color(hex: "#C06848")],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: size, height: size)
            Text("EF")
                .font(.system(size: size * 0.30, weight: .black, design: .rounded))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Thin hairline divider

private struct Hairline: View {
    var indent: CGFloat = 0
    var body: some View {
        Rectangle()
            .fill(BORDER.opacity(0.45))
            .frame(height: 0.5)
            .padding(.leading, indent)
    }
}

// MARK: - Unauthenticated

struct UnauthenticatedView: View {
    var body: some View {
        Link(destination: URL(string: "eazy-family://app")!) {
            VStack(spacing: 12) {
                AppIconView(size: 44)
                Text("Open Eazy.Family\nto sign in")
                    .font(.system(size: 12, weight: .medium))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(MUTED)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

// MARK: - Empty state (authenticated, no data loaded)

struct EmptyStateView: View {
    let mode: WidgetDisplayMode
    var body: some View {
        Link(destination: URL(string: mode.deepLink)!) {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    AppIconView(size: 36)
                    Text(mode.label)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(INK)
                    Spacer()
                }
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: modeIcon(mode))
                        .font(.system(size: 26))
                        .foregroundStyle(accent(for: mode).opacity(0.22))
                    Text(mode.emptyMessage)
                        .font(.system(size: 11))
                        .foregroundStyle(MUTED)
                        .multilineTextAlignment(.center)
                }
                Spacer()
            }
            .padding(12)
        }
    }
}

// MARK: - Small widget

struct SmallWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        Link(destination: URL(string: data.mode.deepLink)!) {
            VStack(alignment: .leading, spacing: 0) {

                // Header: icon + mode label
                HStack(spacing: 8) {
                    AppIconView(size: 34)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(data.mode.label)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(INK)
                            .lineLimit(1)
                        Text(data.items.isEmpty ? "All clear" : "\(data.items.count) \(data.mode.shortStatLabel)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(MUTED)
                    }
                }

                Hairline()
                    .padding(.top, 8)
                    .padding(.bottom, 7)

                if data.items.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        Text("All clear ✓")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(MUTED)
                        Spacer()
                    }
                    Spacer()
                } else {
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach(data.items.prefix(3)) { item in
                            SmallItemRow(item: item, mode: data.mode)
                        }
                    }
                    if data.items.count > 3 {
                        Text("+\(data.items.count - 3) more")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(accent(for: data.mode))
                            .padding(.top, 4)
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(12)
        }
    }
}

struct SmallItemRow: View {
    let item: WidgetItem
    let mode: WidgetDisplayMode

    var body: some View {
        HStack(spacing: 6) {
            if mode == .rituals || mode == .shopping {
                Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 11))
                    .foregroundStyle(item.completed ? accent(for: mode) : BORDER)
            } else {
                RoundedRectangle(cornerRadius: 2)
                    .fill(item.completed ? MUTED.opacity(0.35) : accent(for: mode))
                    .frame(width: 3, height: 13)
            }
            Text(item.title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(item.completed ? MUTED : INK)
                .strikethrough(item.completed)
                .lineLimit(1)
        }
    }
}

// MARK: - Medium widget

struct MediumWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Header: icon + title + date pill
            HStack(spacing: 10) {
                AppIconView(size: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text(data.mode.label)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(INK)
                    Text(data.items.isEmpty ? "Nothing here yet" : "\(data.items.count) \(data.mode.shortStatLabel)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(MUTED)
                }
                Spacer()
                // Date pill — top-right accent element
                Text(entry.date, format: .dateTime.day().month(.abbreviated))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(accent(for: data.mode))
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(accent(for: data.mode).opacity(0.12))
                    .clipShape(Capsule())
            }

            Hairline()
                .padding(.top, 10)
                .padding(.bottom, 8)

            if data.items.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    Text(data.mode.emptyMessage)
                        .font(.system(size: 12))
                        .foregroundStyle(MUTED)
                    Spacer()
                }
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(data.items.prefix(4).enumerated()), id: \.element.id) { idx, item in
                        MediumItemRow(item: item, mode: data.mode)
                        if idx < min(data.items.count, 4) - 1 {
                            Hairline(indent: 20)
                        }
                    }
                }
                if data.items.count > 4 {
                    Text("+\(data.items.count - 4) more")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(accent(for: data.mode))
                        .padding(.top, 4)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(14)
        .widgetURL(URL(string: data.mode.deepLink))
    }
}

struct MediumItemRow: View {
    let item: WidgetItem
    let mode: WidgetDisplayMode

    var body: some View {
        Link(destination: URL(string: item.deepLink)!) {
            HStack(spacing: 8) {
                if mode == .rituals || mode == .shopping {
                    Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 13))
                        .foregroundStyle(item.completed ? accent(for: mode) : BORDER)
                } else {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(item.completed ? MUTED.opacity(0.3) : accent(for: mode))
                        .frame(width: 3, height: 16)
                }
                Text(item.title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(item.completed ? MUTED : INK)
                    .strikethrough(item.completed)
                    .lineLimit(1)
                Spacer()
                if let sub = item.subtitle {
                    Text(sub)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(accent(for: mode))
                }
            }
            .padding(.vertical, 6)
        }
    }
}

// MARK: - Large widget

struct LargeWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Header: icon + title + weekday/date top-right
            HStack(spacing: 12) {
                AppIconView(size: 50)
                VStack(alignment: .leading, spacing: 3) {
                    Text(data.mode.label)
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(INK)
                    Text(data.items.isEmpty ? "Nothing here yet" : "\(data.items.count) \(data.mode.shortStatLabel)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(MUTED)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(entry.date, format: .dateTime.weekday(.wide))
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(accent(for: data.mode))
                    Text(entry.date, format: .dateTime.day().month(.abbreviated))
                        .font(.system(size: 11))
                        .foregroundStyle(MUTED)
                }
            }

            Hairline()
                .padding(.top, 12)
                .padding(.bottom, 8)

            if data.items.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        Image(systemName: modeIcon(data.mode))
                            .font(.system(size: 34))
                            .foregroundStyle(accent(for: data.mode).opacity(0.2))
                        Text(data.mode.emptyMessage)
                            .font(.system(size: 13))
                            .foregroundStyle(MUTED)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(data.items.prefix(8).enumerated()), id: \.element.id) { idx, item in
                        LargeItemRow(item: item, mode: data.mode)
                        if idx < min(data.items.count, 8) - 1 {
                            Hairline(indent: 24)
                        }
                    }
                }
                if data.items.count > 8 {
                    Text("+\(data.items.count - 8) more")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(accent(for: data.mode))
                        .padding(.top, 6)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(16)
        .widgetURL(URL(string: data.mode.deepLink))
    }
}

struct LargeItemRow: View {
    let item: WidgetItem
    let mode: WidgetDisplayMode

    var body: some View {
        Link(destination: URL(string: item.deepLink)!) {
            HStack(spacing: 10) {
                if mode == .rituals || mode == .shopping {
                    Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 15))
                        .foregroundStyle(item.completed ? accent(for: mode) : BORDER)
                } else {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(item.completed ? MUTED.opacity(0.3) : accent(for: mode))
                        .frame(width: 3, height: 18)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(item.title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(item.completed ? MUTED : INK)
                        .strikethrough(item.completed)
                        .lineLimit(1)
                    if let sub = item.subtitle {
                        Text(sub)
                            .font(.system(size: 10))
                            .foregroundStyle(accent(for: mode))
                    }
                }
                Spacer()
            }
            .padding(.vertical, 6)
        }
    }
}

// MARK: - Extra Large widget (iPad — two-column content)

struct ExtraLargeWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    private var leftItems: [WidgetItem]  { Array(data.items.prefix(10).enumerated().filter { $0.offset % 2 == 0 }.map { $0.element }) }
    private var rightItems: [WidgetItem] { Array(data.items.prefix(10).enumerated().filter { $0.offset % 2 != 0 }.map { $0.element }) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Header
            HStack(spacing: 14) {
                AppIconView(size: 56)
                VStack(alignment: .leading, spacing: 3) {
                    Text(data.mode.label)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(INK)
                    Text(data.items.isEmpty ? "Nothing here yet" : "\(data.items.count) \(data.mode.shortStatLabel)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MUTED)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    Text(entry.date, format: .dateTime.weekday(.wide))
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(accent(for: data.mode))
                    Text(entry.date, format: .dateTime.day().month(.wide))
                        .font(.system(size: 12))
                        .foregroundStyle(MUTED)
                }
            }

            Hairline()
                .padding(.top, 14)
                .padding(.bottom, 10)

            if data.items.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 10) {
                        Image(systemName: modeIcon(data.mode))
                            .font(.system(size: 42))
                            .foregroundStyle(accent(for: data.mode).opacity(0.2))
                        Text(data.mode.emptyMessage)
                            .font(.system(size: 15))
                            .foregroundStyle(MUTED)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                HStack(alignment: .top, spacing: 0) {
                    // Left column
                    VStack(spacing: 0) {
                        ForEach(Array(leftItems.enumerated()), id: \.element.id) { idx, item in
                            LargeItemRow(item: item, mode: data.mode)
                            if idx < leftItems.count - 1 {
                                Hairline(indent: 24)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity)

                    Rectangle()
                        .fill(BORDER.opacity(0.4))
                        .frame(width: 0.5)
                        .padding(.horizontal, 10)

                    // Right column
                    VStack(spacing: 0) {
                        ForEach(Array(rightItems.enumerated()), id: \.element.id) { idx, item in
                            LargeItemRow(item: item, mode: data.mode)
                            if idx < rightItems.count - 1 {
                                Hairline(indent: 24)
                            }
                        }
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity)
                }

                if data.items.count > 10 {
                    Text("+\(data.items.count - 10) more")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(accent(for: data.mode))
                        .padding(.top, 6)
                }
            }
        }
        .padding(18)
        .widgetURL(URL(string: data.mode.deepLink))
    }
}

// MARK: - Mode icon helper

func modeIcon(_ mode: WidgetDisplayMode) -> String {
    switch mode {
    case .events:    return "calendar"
    case .shopping:  return "cart"
    case .tasks:     return "checkmark.square"
    case .reminders: return "bell"
    case .rituals:   return "sparkles"
    case .journal:   return "mic.fill"
    }
}

// MARK: - Previews

#Preview("Small – Events", as: .systemSmall) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: .placeholder(mode: .events), isAuthenticated: true)
}

#Preview("Medium – Calendar", as: .systemMedium) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: .placeholder(mode: .events), isAuthenticated: true)
}

#Preview("Medium – Shopping", as: .systemMedium) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: .placeholder(mode: .shopping), isAuthenticated: true)
}

#Preview("Large – Tasks", as: .systemLarge) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: .placeholder(mode: .tasks), isAuthenticated: true)
}

#Preview("Small – Empty", as: .systemSmall) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: nil, isAuthenticated: true)
}

#Preview("Medium – Empty", as: .systemMedium) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: nil, isAuthenticated: true)
}

#Preview("Extra Large – Events", as: .systemExtraLarge) {
    EazyFamilyWidget()
} timeline: {
    EazyEntry(date: .now, configuration: EazyWidgetIntent(), data: .placeholder(mode: .events), isAuthenticated: true)
}
