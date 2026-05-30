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
    var statLabel: String {
        switch self {
        case .events:    return "event(s)"
        case .shopping:  return "item(s)"
        case .tasks:     return "task(s)"
        case .reminders: return "reminder(s)"
        case .rituals:   return "ritual(s)"
        case .journal:   return "entr(y/ies)"
        }
    }
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

// MARK: - Brand panel (left column — medium & large)

struct BrandPanel: View {
    let mode: WidgetDisplayMode
    let itemCount: Int
    let updatedAt: Date
    var compact: Bool = false   // true = medium, false = large

    private let grad = LinearGradient(
        colors: [Color(hex: "#964735"), Color(hex: "#B85840")],
        startPoint: .top,
        endPoint: .bottom
    )

    var body: some View {
        ZStack(alignment: .leading) {
            grad
            VStack(alignment: .leading, spacing: 0) {

                // Logo mark
                ZStack {
                    RoundedRectangle(cornerRadius: compact ? 7 : 9)
                        .fill(Color.white.opacity(0.18))
                        .frame(width: compact ? 32 : 38, height: compact ? 32 : 38)
                    Text("EF")
                        .font(.system(size: compact ? 12 : 14, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                }

                Spacer()

                // Wordmark
                VStack(alignment: .leading, spacing: 1) {
                    Text("Eazy")
                        .font(.system(size: compact ? 14 : 16, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                    Text("Family")
                        .font(.system(size: compact ? 14 : 16, weight: .black, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.5))
                }

                if !compact {
                    Spacer().frame(height: 10)

                    // Item count stat
                    if itemCount > 0 {
                        Text("\(itemCount)")
                            .font(.system(size: 22, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text(mode.shortStatLabel)
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.white.opacity(0.7))
                            .padding(.bottom, 8)
                    }

                    // Updated time
                    Text(updatedAt.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: 8))
                        .foregroundStyle(Color.white.opacity(0.45))
                } else {
                    // Compact: just a small count pill
                    if itemCount > 0 {
                        Spacer().frame(height: 6)
                        Text("\(itemCount) \(mode.shortStatLabel)")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color.white.opacity(0.75))
                    }
                }
            }
            .padding(compact ? 10 : 12)
        }
    }
}

// MARK: - Small brand strip (top bar for small widget)

struct SmallBrandStrip: View {
    let mode: WidgetDisplayMode

    private let grad = LinearGradient(
        colors: [Color(hex: "#964735"), Color(hex: "#C06848")],
        startPoint: .leading,
        endPoint: .trailing
    )

    var body: some View {
        ZStack {
            grad
            HStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color.white.opacity(0.2))
                        .frame(width: 22, height: 22)
                    Text("EF")
                        .font(.system(size: 8, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                }
                Text(mode.label)
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color.white.opacity(0.9))
                    .lineLimit(1)
                Spacer()
            }
            .padding(.horizontal, 10)
        }
        .frame(height: 34)
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
        Link(destination: URL(string: mode.deepLink)!) {
            VStack(spacing: 0) {
                SmallBrandStrip(mode: mode)
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 26))
                        .foregroundStyle(TC.opacity(0.25))
                    Text(mode.emptyMessage)
                        .font(.system(size: 11))
                        .foregroundStyle(MUTED)
                        .multilineTextAlignment(.center)
                }
                Spacer()
            }
        }
    }
}

// MARK: - Small widget (brand strip top + items)

struct SmallWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        Link(destination: URL(string: data.mode.deepLink)!) {
            VStack(spacing: 0) {
                SmallBrandStrip(mode: data.mode)

                VStack(alignment: .leading, spacing: 0) {
                    if data.items.isEmpty {
                        Spacer()
                        HStack {
                            Spacer()
                            Text("All clear ✓")
                                .font(.system(size: 12, weight: .medium))
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
                        .padding(.top, 10)
                        .padding(.horizontal, 12)

                        if data.items.count > 3 {
                            Text("+\(data.items.count - 3) more")
                                .font(.system(size: 9))
                                .foregroundStyle(accent(for: data.mode))
                                .padding(.horizontal, 12)
                                .padding(.top, 4)
                        }
                        Spacer(minLength: 0)
                    }
                }
            }
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

// MARK: - Medium widget (brand panel left + content right)

struct MediumWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        HStack(spacing: 0) {

            // Left: brand panel
            BrandPanel(mode: data.mode, itemCount: data.items.count, updatedAt: entry.date, compact: true)
                .frame(width: 96)

            // Divider
            Rectangle()
                .fill(BORDER.opacity(0.5))
                .frame(width: 0.5)

            // Right: content
            VStack(alignment: .leading, spacing: 0) {
                Text(data.mode.label)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .textCase(.uppercase)
                    .tracking(0.4)
                    .foregroundStyle(accent(for: data.mode))
                    .padding(.bottom, 8)

                if data.items.isEmpty {
                    Spacer()
                    Text(data.mode.emptyMessage)
                        .font(.system(size: 12))
                        .foregroundStyle(MUTED)
                    Spacer()
                } else {
                    VStack(spacing: 0) {
                        ForEach(Array(data.items.prefix(4).enumerated()), id: \.element.id) { idx, item in
                            MediumItemRow(item: item, mode: data.mode)
                            if idx < min(data.items.count, 4) - 1 {
                                Divider()
                                    .background(BORDER.opacity(0.4))
                                    .padding(.leading, 18)
                            }
                        }
                    }
                    if data.items.count > 4 {
                        Text("+\(data.items.count - 4) more")
                            .font(.system(size: 9))
                            .foregroundStyle(accent(for: data.mode))
                            .padding(.top, 4)
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
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
                        .font(.system(size: 10))
                        .foregroundStyle(accent(for: mode))
                }
            }
            .padding(.vertical, 5)
        }
    }
}

// MARK: - Large widget (brand panel left + content right)

struct LargeWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    var body: some View {
        HStack(spacing: 0) {

            // Left: brand panel (wider + shows count + time)
            BrandPanel(mode: data.mode, itemCount: data.items.count, updatedAt: entry.date, compact: false)
                .frame(width: 104)

            // Divider
            Rectangle()
                .fill(BORDER.opacity(0.5))
                .frame(width: 0.5)

            // Right: content
            VStack(alignment: .leading, spacing: 0) {
                Text(data.mode.label)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .textCase(.uppercase)
                    .tracking(0.4)
                    .foregroundStyle(accent(for: data.mode))
                    .padding(.bottom, 10)

                Divider()
                    .background(BORDER.opacity(0.6))
                    .padding(.bottom, 4)

                if data.items.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 28))
                                .foregroundStyle(accent(for: data.mode).opacity(0.25))
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
                                Divider()
                                    .background(BORDER.opacity(0.35))
                                    .padding(.leading, 24)
                            }
                        }
                    }
                    if data.items.count > 8 {
                        Text("+\(data.items.count - 8) more")
                            .font(.system(size: 10))
                            .foregroundStyle(accent(for: data.mode))
                            .padding(.top, 6)
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
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

// MARK: - Extra Large widget (iPad — brand panel left + two content columns right)

struct ExtraLargeWidgetView: View {
    let data: WidgetEntryData
    let entry: EazyEntry

    // Split items into two columns
    private var leftItems: [WidgetItem]  { Array(data.items.prefix(8).enumerated().filter { $0.offset % 2 == 0 }.map { $0.element }) }
    private var rightItems: [WidgetItem] { Array(data.items.prefix(8).enumerated().filter { $0.offset % 2 != 0 }.map { $0.element }) }

    var body: some View {
        HStack(spacing: 0) {

            // Left: brand panel
            BrandPanel(mode: data.mode, itemCount: data.items.count, updatedAt: entry.date, compact: false)
                .frame(width: 120)

            Rectangle()
                .fill(BORDER.opacity(0.5))
                .frame(width: 0.5)

            // Right: two-column content grid
            VStack(alignment: .leading, spacing: 0) {
                Text(data.mode.label)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .textCase(.uppercase)
                    .tracking(0.4)
                    .foregroundStyle(accent(for: data.mode))
                    .padding(.bottom, 10)

                Divider().background(BORDER.opacity(0.6)).padding(.bottom, 6)

                if data.items.isEmpty {
                    Spacer()
                    HStack {
                        Spacer()
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 34))
                                .foregroundStyle(accent(for: data.mode).opacity(0.25))
                            Text(data.mode.emptyMessage)
                                .font(.system(size: 14))
                                .foregroundStyle(MUTED)
                        }
                        Spacer()
                    }
                    Spacer()
                } else {
                    HStack(alignment: .top, spacing: 0) {
                        // Column A
                        VStack(spacing: 0) {
                            ForEach(Array(leftItems.enumerated()), id: \.element.id) { idx, item in
                                LargeItemRow(item: item, mode: data.mode)
                                if idx < leftItems.count - 1 {
                                    Divider().background(BORDER.opacity(0.3)).padding(.leading, 22)
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity)

                        Rectangle()
                            .fill(BORDER.opacity(0.3))
                            .frame(width: 0.5)
                            .padding(.horizontal, 8)

                        // Column B
                        VStack(spacing: 0) {
                            ForEach(Array(rightItems.enumerated()), id: \.element.id) { idx, item in
                                LargeItemRow(item: item, mode: data.mode)
                                if idx < rightItems.count - 1 {
                                    Divider().background(BORDER.opacity(0.3)).padding(.leading, 22)
                                }
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity)
                    }

                    if data.items.count > 8 {
                        Text("+\(data.items.count - 8) more")
                            .font(.system(size: 10))
                            .foregroundStyle(accent(for: data.mode))
                            .padding(.top, 6)
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
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
