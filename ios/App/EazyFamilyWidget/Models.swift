import Foundation

// MARK: - App Group

let kAppGroup = "group.eazy.family"
let kSupabaseURL = "https://jfztyhuagxruhawchfem.supabase.co"
let kSupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0"

// MARK: - Display Mode

enum WidgetDisplayMode: String, CaseIterable, Codable {
    case events    = "events"
    case shopping  = "shopping"
    case tasks     = "tasks"
    case reminders = "reminders"
    case rituals   = "rituals"

    var label: String {
        switch self {
        case .events:    return "Today's Events"
        case .shopping:  return "Shopping List"
        case .tasks:     return "Upcoming Tasks"
        case .reminders: return "Reminders"
        case .rituals:   return "Rituals"
        }
    }

    var deepLink: String {
        switch self {
        case .events:    return "eazy-family://app/calendar"
        case .shopping:  return "eazy-family://app/shopping"
        case .tasks:     return "eazy-family://app/todos"
        case .reminders: return "eazy-family://app/calendar"
        case .rituals:   return "eazy-family://app/rituals"
        }
    }

    var accentHex: String {
        switch self {
        case .events:    return "#964735"
        case .shopping:  return "#44664F"
        case .tasks:     return "#6E8FE5"
        case .reminders: return "#B88A00"
        case .rituals:   return "#964735"
        }
    }
}

// MARK: - Raw Supabase response shapes

struct RawEvent: Decodable {
    let id: String
    let title: String
    let start_date: String
    let end_date: String?
    let all_day: Bool
    let location: String?
}

struct RawTask: Decodable {
    let id: String
    let title: String
    let due_date: String?
    let completed: Bool
}

// MARK: - Unified widget item

struct WidgetItem: Identifiable {
    let id: String
    let title: String
    let subtitle: String?  // time, due date, etc.
    let completed: Bool
    let deepLink: String
}

// MARK: - Entry data

struct WidgetEntryData {
    let items: [WidgetItem]
    let mode: WidgetDisplayMode
    let fetchedAt: Date
}

// MARK: - Placeholder data

extension WidgetEntryData {
    static func placeholder(mode: WidgetDisplayMode) -> WidgetEntryData {
        let items: [WidgetItem]
        switch mode {
        case .events:
            items = [
                WidgetItem(id: "1", title: "School pickup", subtitle: "3:30 PM", completed: false, deepLink: mode.deepLink),
                WidgetItem(id: "2", title: "Dinner with Mia", subtitle: "7:00 PM", completed: false, deepLink: mode.deepLink),
            ]
        case .shopping:
            items = [
                WidgetItem(id: "1", title: "Milk", subtitle: nil, completed: false, deepLink: mode.deepLink),
                WidgetItem(id: "2", title: "Bread", subtitle: nil, completed: false, deepLink: mode.deepLink),
                WidgetItem(id: "3", title: "Eggs", subtitle: nil, completed: true, deepLink: mode.deepLink),
            ]
        case .tasks:
            items = [
                WidgetItem(id: "1", title: "Call the dentist", subtitle: "Today", completed: false, deepLink: mode.deepLink),
                WidgetItem(id: "2", title: "Renew car insurance", subtitle: "Tomorrow", completed: false, deepLink: mode.deepLink),
            ]
        case .reminders:
            items = [
                WidgetItem(id: "1", title: "Grandma's birthday", subtitle: "In 3 days", completed: false, deepLink: mode.deepLink),
            ]
        case .rituals:
            items = [
                WidgetItem(id: "1", title: "Morning walk", subtitle: nil, completed: true, deepLink: mode.deepLink),
                WidgetItem(id: "2", title: "Read 20 pages", subtitle: nil, completed: false, deepLink: mode.deepLink),
            ]
        }
        return WidgetEntryData(items: items, mode: mode, fetchedAt: .now)
    }
}
