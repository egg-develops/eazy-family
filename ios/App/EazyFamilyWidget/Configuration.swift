import AppIntents
import WidgetKit

// MARK: - Display Mode AppEnum

enum DisplayModeOption: String, AppEnum {
    case events    = "events"
    case shopping  = "shopping"
    case tasks     = "tasks"
    case reminders = "reminders"
    case rituals   = "rituals"

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Display"
    static var caseDisplayRepresentations: [DisplayModeOption: DisplayRepresentation] = [
        .events:    "Today's Events",
        .shopping:  "Shopping List",
        .tasks:     "Upcoming Tasks",
        .reminders: "Reminders",
        .rituals:   "Rituals",
    ]

    var asModel: WidgetDisplayMode { WidgetDisplayMode(rawValue: rawValue)! }
}

// MARK: - Item Count AppEnum

enum ItemCountOption: Int, AppEnum {
    case three = 3
    case five  = 5
    case ten   = 10

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Items"
    static var caseDisplayRepresentations: [ItemCountOption: DisplayRepresentation] = [
        .three: "3 items",
        .five:  "5 items",
        .ten:   "10 items",
    ]
}

// MARK: - Widget Configuration Intent

struct EazyWidgetIntent: AppIntent, WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Eazy.Family"
    static var description = IntentDescription("Choose what your family widget shows.")

    @Parameter(title: "Display", default: .events)
    var displayMode: DisplayModeOption

    @Parameter(title: "Items to show", default: .five)
    var itemCount: ItemCountOption

    @Parameter(title: "Show completed", default: false)
    var showCompleted: Bool
}
