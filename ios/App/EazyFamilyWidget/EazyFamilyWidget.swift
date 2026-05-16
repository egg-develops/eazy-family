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
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
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
            case .systemSmall:  SmallWidgetView(data: data, entry: entry)
            case .systemMedium: MediumWidgetView(data: data, entry: entry)
            default:            LargeWidgetView(data: data, entry: entry)
            }
        } else {
            EmptyStateView(mode: entry.configuration.displayMode.asModel)
        }
    }
}

// MARK: - Unauthenticated

struct UnauthenticatedView: View {
    var body: some View {
        Link(destination: URL(string: "eazy-family://app")!) {
            VStack(spacing: 8) {
                Image(systemName: "lock.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(TC)
                Text("Open Eazy.Family\nto sign in")
                    .font(.system(size: 12, weight: .medium))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(MUTED)
            }
            .padding()
        }
    }
}

// MARK: - Empty state

struct EmptyStateView: View {
    let mode: WidgetDisplayMode
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: modeIcon(mode))
                .font(.system(size: 22))
                .foregroundStyle(accent(for: mode).opacity(0.4))
            Text("Nothing here yet")
                .font(.system(size: 12))
                .foregroundStyle(MUTED)
        }
    }
}

// MARK: - Small widget (up to 3 items)

struct SmallWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        Link(destination: URL(string: data.mode.deepLink)!) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 5) {
                    Circle()
                        .fill(accent(for: data.mode))
                        .frame(width: 6, height: 6)
                    Text(data.mode.label)
                        .font(.system(size: 9, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .foregroundStyle(MUTED)
                    Spacer()
                }
                .padding(.bottom, 8)

                if data.items.isEmpty {
                    Text("All clear ✓")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(MUTED)
                } else {
                    VStack(alignment: .leading, spacing: 5) {
                        ForEach(data.items.prefix(3)) { item in
                            SmallItemRow(item: item, mode: data.mode)
                        }
                    }
                }

                Spacer(minLength: 0)

                if data.items.count > 3 {
                    Text("+\(data.items.count - 3) more")
                        .font(.system(size: 9))
                        .foregroundStyle(accent(for: data.mode))
                        .padding(.top, 4)
                }
            }
            .padding(14)
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
                    .fill(accent(for: mode))
                    .frame(width: 3, height: 13)
            }
            Text(item.title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(item.completed ? MUTED : INK)
                .strikethrough(item.completed)
                .lineLimit(1)
        }
    }
}

// MARK: - Medium widget (up to 5 items)

struct MediumWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: modeIcon(data.mode))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(accent(for: data.mode))
                    Text(data.mode.label)
                        .font(.system(size: 11, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .foregroundStyle(MUTED)
                }
                Spacer()
                Text(entry.date, style: .time)
                    .font(.system(size: 10))
                    .foregroundStyle(MUTED.opacity(0.5))
            }
            .padding(.bottom, 10)

            if data.items.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    Text("Nothing on the list ✓")
                        .font(.system(size: 13))
                        .foregroundStyle(MUTED)
                    Spacer()
                }
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(data.items.prefix(5).enumerated()), id: \.element.id) { idx, item in
                        MediumItemRow(item: item, mode: data.mode)
                        if idx < min(data.items.count, 5) - 1 {
                            Divider()
                                .background(BORDER.opacity(0.5))
                                .padding(.leading, 20)
                        }
                    }
                }
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
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(item.completed ? MUTED : INK)
                    .strikethrough(item.completed)
                    .lineLimit(1)
                Spacer()
                if let sub = item.subtitle {
                    Text(sub)
                        .font(.system(size: 11))
                        .foregroundStyle(accent(for: mode))
                }
            }
            .padding(.vertical, 5)
        }
    }
}

// MARK: - Large widget (up to 10 items)

struct LargeWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Eazy.Family")
                        .font(.system(size: 10, weight: .bold))
                        .textCase(.uppercase)
                        .tracking(0.8)
                        .foregroundStyle(TC)
                    Text(data.mode.label)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(INK)
                }
                Spacer()
                Image(systemName: modeIcon(data.mode))
                    .font(.system(size: 20))
                    .foregroundStyle(accent(for: data.mode).opacity(0.2))
            }
            .padding(.bottom, 12)

            Divider().background(BORDER)

            if data.items.isEmpty {
                Spacer()
                HStack {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 30))
                            .foregroundStyle(accent(for: data.mode).opacity(0.3))
                        Text("All clear for now")
                            .font(.system(size: 14))
                            .foregroundStyle(MUTED)
                    }
                    Spacer()
                }
                Spacer()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(data.items.prefix(10).enumerated()), id: \.element.id) { idx, item in
                        LargeItemRow(item: item, mode: data.mode)
                        if idx < min(data.items.count, 10) - 1 {
                            Divider()
                                .background(BORDER.opacity(0.4))
                                .padding(.leading, 28)
                        }
                    }
                }
            }

            Spacer(minLength: 0)

            Divider().background(BORDER).padding(.top, 8)
            HStack {
                Text("Updated " + entry.date.formatted(date: .omitted, time: .shortened))
                    .font(.system(size: 10))
                    .foregroundStyle(MUTED.opacity(0.6))
                Spacer()
                Text("\(data.items.count) item\(data.items.count == 1 ? "" : "s")")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(accent(for: data.mode))
            }
            .padding(.top, 6)
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
                        .font(.system(size: 16))
                        .foregroundStyle(item.completed ? accent(for: mode) : BORDER)
                } else {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(item.completed ? MUTED.opacity(0.3) : accent(for: mode))
                        .frame(width: 3, height: 20)
                }
                VStack(alignment: .leading, spacing: 1) {
                    Text(item.title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(item.completed ? MUTED : INK)
                        .strikethrough(item.completed)
                        .lineLimit(2)
                    if let sub = item.subtitle {
                        Text(sub)
                            .font(.system(size: 11))
                            .foregroundStyle(accent(for: mode))
                    }
                }
                Spacer()
            }
            .padding(.vertical, 7)
        }
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
    }
}

// MARK: - Previews

#Preview("Small – Events", as: .systemSmall) {
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
