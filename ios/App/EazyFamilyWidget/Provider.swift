import WidgetKit
import SwiftUI

struct EazyEntry: TimelineEntry {
    let date: Date
    let configuration: EazyWidgetIntent
    let data: WidgetEntryData?
    let isAuthenticated: Bool
}

struct EazyProvider: AppIntentTimelineProvider {
    typealias Entry = EazyEntry
    typealias Intent = EazyWidgetIntent

    func placeholder(in context: Context) -> EazyEntry {
        EazyEntry(
            date: .now,
            configuration: EazyWidgetIntent(),
            data: .placeholder(mode: .events),
            isAuthenticated: true
        )
    }

    func snapshot(for configuration: EazyWidgetIntent, in context: Context) async -> EazyEntry {
        let mode = configuration.displayMode.asModel
        let count = configuration.itemCount.rawValue

        if context.isPreview {
            return EazyEntry(date: .now, configuration: configuration, data: .placeholder(mode: mode), isAuthenticated: true)
        }

        let data = await DataFetcher.shared.fetch(
            mode: mode, itemCount: count, showCompleted: configuration.showCompleted
        )
        return EazyEntry(
            date: .now, configuration: configuration, data: data,
            isAuthenticated: DataFetcher.shared.isAuthenticated
        )
    }

    func timeline(for configuration: EazyWidgetIntent, in context: Context) async -> Timeline<EazyEntry> {
        let mode = configuration.displayMode.asModel
        let count = configuration.itemCount.rawValue

        let data = await DataFetcher.shared.fetch(
            mode: mode, itemCount: count, showCompleted: configuration.showCompleted
        )
        let entry = EazyEntry(
            date: .now, configuration: configuration, data: data,
            isAuthenticated: DataFetcher.shared.isAuthenticated
        )

        // Refresh every 30 minutes
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        return Timeline(entries: [entry], policy: .after(nextRefresh))
    }
}
