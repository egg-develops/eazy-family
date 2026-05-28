import Foundation

class DataFetcher {
    static let shared = DataFetcher()

    private let defaults: UserDefaults?

    private init() {
        defaults = UserDefaults(suiteName: kAppGroup)
    }

    var accessToken: String? {
        defaults?.string(forKey: "eazy_access_token")
    }

    var isAuthenticated: Bool { accessToken != nil }

    // MARK: - Main fetch

    func fetch(mode: WidgetDisplayMode, itemCount: Int, showCompleted: Bool) async -> WidgetEntryData? {
        guard let token = accessToken else { return nil }

        switch mode {
        case .events, .reminders:
            return await fetchEvents(token: token, mode: mode, limit: itemCount)
        case .tasks:
            return await fetchTasks(token: token, showCompleted: showCompleted, limit: itemCount)
        case .shopping:
            return await fetchShopping(token: token, showCompleted: showCompleted, limit: itemCount)
        case .rituals:
            return await fetchRituals(token: token, limit: itemCount)
        case .journal:
            return await fetchJournal(token: token, limit: itemCount)
        }
    }

    // MARK: - Events / Reminders

    private func fetchEvents(token: String, mode: WidgetDisplayMode, limit: Int) async -> WidgetEntryData? {
        let now = ISO8601DateFormatter().string(from: .now)
        let tomorrow = ISO8601DateFormatter().string(from: Date().addingTimeInterval(86400))
        let weekAhead = ISO8601DateFormatter().string(from: Date().addingTimeInterval(7 * 86400))

        let rangeEnd = mode == .events ? tomorrow : weekAhead
        let typeFilter = mode == .reminders ? "&type=eq.reminder" : ""

        let urlString = "\(kSupabaseURL)/rest/v1/events?select=id,title,start_date,end_date,all_day,location\(typeFilter)&start_date=gte.\(now)&start_date=lte.\(rangeEnd)&order=start_date&limit=\(limit)"

        guard let data = await get(urlString, token: token) else { return nil }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let rows = try? JSONDecoder().decode([RawEvent].self, from: data) else { return nil }

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"

        let items: [WidgetItem] = rows.map { e in
            var subtitle: String? = nil
            if !e.all_day, let start = formatter.date(from: e.start_date) {
                subtitle = timeFormatter.string(from: start)
            } else if e.all_day {
                subtitle = "All day"
            }
            return WidgetItem(id: e.id, title: e.title, subtitle: subtitle, completed: false, deepLink: mode.deepLink)
        }

        return WidgetEntryData(items: items, mode: mode, fetchedAt: .now)
    }

    // MARK: - Tasks

    private func fetchTasks(token: String, showCompleted: Bool, limit: Int) async -> WidgetEntryData? {
        var urlString = "\(kSupabaseURL)/rest/v1/tasks?select=id,title,due_date,completed&type=eq.task&order=due_date&limit=\(limit)"
        if !showCompleted { urlString += "&completed=eq.false" }

        guard let data = await get(urlString, token: token) else { return nil }
        guard let rows = try? JSONDecoder().decode([RawTask].self, from: data) else { return nil }

        let relFormatter = RelativeDateTimeFormatter()
        relFormatter.unitsStyle = .abbreviated

        let items: [WidgetItem] = rows.map { t in
            var subtitle: String? = nil
            if let dueDateStr = t.due_date {
                let fmt = ISO8601DateFormatter()
                fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let due = fmt.date(from: dueDateStr) {
                    subtitle = relFormatter.localizedString(for: due, relativeTo: .now)
                }
            }
            return WidgetItem(id: t.id, title: t.title, subtitle: subtitle, completed: t.completed, deepLink: WidgetDisplayMode.tasks.deepLink)
        }

        return WidgetEntryData(items: items, mode: .tasks, fetchedAt: .now)
    }

    // MARK: - Shopping

    private func fetchShopping(token: String, showCompleted: Bool, limit: Int) async -> WidgetEntryData? {
        var urlString = "\(kSupabaseURL)/rest/v1/tasks?select=id,title,completed&type=in.(shopping,shopping_personal)&order=created_at&limit=\(limit)"
        if !showCompleted { urlString += "&completed=eq.false" }

        guard let data = await get(urlString, token: token) else { return nil }
        guard let rows = try? JSONDecoder().decode([RawTask].self, from: data) else { return nil }

        let items: [WidgetItem] = rows.map { t in
            WidgetItem(id: t.id, title: t.title, subtitle: nil, completed: t.completed, deepLink: WidgetDisplayMode.shopping.deepLink)
        }

        return WidgetEntryData(items: items, mode: .shopping, fetchedAt: .now)
    }

    // MARK: - Rituals (stored as tasks with type='ritual')

    private func fetchRituals(token: String, limit: Int) async -> WidgetEntryData? {
        let urlString = "\(kSupabaseURL)/rest/v1/tasks?select=id,title,completed&type=eq.ritual&order=created_at&limit=\(limit)"

        guard let data = await get(urlString, token: token) else { return nil }
        guard let rows = try? JSONDecoder().decode([RawTask].self, from: data) else { return nil }

        let items: [WidgetItem] = rows.map { t in
            WidgetItem(id: t.id, title: t.title, subtitle: nil, completed: t.completed, deepLink: WidgetDisplayMode.rituals.deepLink)
        }

        return WidgetEntryData(items: items, mode: .rituals, fetchedAt: .now)
    }

    // MARK: - Journal (voice notes stored as tasks with type='journal')

    private func fetchJournal(token: String, limit: Int) async -> WidgetEntryData? {
        let urlString = "\(kSupabaseURL)/rest/v1/tasks?select=id,title,created_at&type=eq.journal&order=created_at.desc&limit=\(limit)"

        guard let data = await get(urlString, token: token) else { return nil }

        struct RawJournal: Decodable {
            let id: String
            let title: String
            let created_at: String?
        }
        guard let rows = try? JSONDecoder().decode([RawJournal].self, from: data) else { return nil }

        let relFormatter = RelativeDateTimeFormatter()
        relFormatter.unitsStyle = .abbreviated

        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let items: [WidgetItem] = rows.map { j in
            var subtitle: String? = nil
            if let createdStr = j.created_at, let created = fmt.date(from: createdStr) {
                subtitle = relFormatter.localizedString(for: created, relativeTo: .now)
            }
            return WidgetItem(id: j.id, title: j.title, subtitle: subtitle, completed: false, deepLink: WidgetDisplayMode.journal.deepLink)
        }

        return WidgetEntryData(items: items, mode: .journal, fetchedAt: .now)
    }

    // MARK: - Network helper

    private func get(_ urlString: String, token: String) async -> Data? {
        guard let url = URL(string: urlString) else { return nil }
        var req = URLRequest(url: url, timeoutInterval: 10)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(kSupabaseAnonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            return data
        } catch {
            return nil
        }
    }
}
