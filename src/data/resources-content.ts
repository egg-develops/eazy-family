// ─────────────────────────────────────────────
// Eazy.Family — Resources content data
// ─────────────────────────────────────────────

export type Lang = 'en' | 'de' | 'fr' | 'it';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  tag: string;
  excerpt: string;
  body: string;
  keywords: string[];
  metaDescription: string;
}

export interface ParentingArticle {
  slug: string;
  title: string;
  tag: string;
  excerpt: string;
  body: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  tagline: string;
  category: string;
  searchQuery: string;
  badge: string;
}

// ─────────────────────────────────────────────
// BLOG POSTS
// ─────────────────────────────────────────────

export const BLOG_POSTS: Record<Lang, BlogPost[]> = {

  en: [
    {
      slug: 'how-to-organise-family-life-2026',
      title: 'How to Organise Your Family Life in 2026',
      date: '2026-03-12',
      readTime: '6 min',
      tag: 'Organisation',
      excerpt: 'Most families are juggling six or more apps just to stay afloat. Here\'s how to bring everything together — and actually feel in control.',
      keywords: ['family organizer app', 'organize family life', 'family planning app', 'family management'],
      metaDescription: 'Struggling to keep your family organized across too many apps? Learn the 3 principles and 4-step plan that actually work in 2026.',
      body: `**The fragmentation problem nobody talks about**

Ask any parent what apps they use to run family life and the list gets long fast. There's a group chat for coordinating pickups, a shared Google Calendar that only two out of four family members actually check, a Notes app for shopping lists, a school app for homework updates, a meal-planning app someone downloaded six months ago and half-forgot, and a family photo album that's technically an app too. Six tools. Minimum. And that's before you count the sticky notes on the fridge.

The result isn't organisation — it's organised chaos. Things fall through the gaps. Someone didn't see the message. The list wasn't updated. Nobody told the kids. Sound familiar?

**Three principles that change everything**

The families who genuinely feel on top of things tend to operate by three simple principles. Not by using more tools — usually by using fewer.

**1. Centralisation.** One place for everything. One calendar every family member can see. One shopping list that updates in real time. One place to send a message and know it was received. Fragmentation is the enemy of calm.

**2. Visibility.** Everyone in the family should be able to see what's happening — at their level. Kids don't need a mortgage spreadsheet; they need to know what's for dinner and when football practice starts. Parents need to see the week's commitments at a glance. Visibility by design, not by accident.

**3. Delegation.** Organisation shouldn't fall on one person. The mental load is real, and it's heavy. Systems that make it easy to assign tasks, share responsibility, and track progress without having to chase anyone — those are the systems that actually stick.

**A practical 4-step plan**

**Step 1: Audit what you're using.** Write down every app and tool your family uses to communicate and organise. You'll probably surprise yourself. Which of these actually add value, and which are just adding noise?

**Step 2: Pick one home for your calendar.** Not two, not a compromise between Google and Apple — one. Make sure every family member has it on their phone and that events get added there automatically.

**Step 3: Consolidate your lists.** Shopping, to-dos, school deadlines — move them all into one shared list space. Real-time sync matters here: if one person updates the shopping list from the supermarket, everyone else should see it immediately.

**Step 4: Set a weekly family rhythm.** Five minutes on Sunday evening to review the week ahead is worth more than a dozen chasing messages on Monday morning. Get everyone around the table (or around the app) and go through the week together.

**The 2026 AI advantage**

What's new in 2026 is that AI can now take some of the organisational work off your hands entirely. Asking an AI assistant to pull together the week's key events, suggest meals based on what's already in the calendar, or remind you about school uniform days — that's not science fiction anymore. It's the kind of thing that quietly saves you fifteen minutes a day.

This is exactly the gap that apps like **Eazy.Family** are designed to fill: a private, ad-free hub where your calendar, lists, messages, and AI assistant all live together — without the noise of a general-purpose platform.

Organisation doesn't have to feel like work. With the right system, it starts to feel like relief.`,
    },

    {
      slug: 'best-family-calendar-apps-2026',
      title: 'The Best Family Calendar Apps for 2026 — Compared',
      date: '2026-02-28',
      readTime: '5 min',
      tag: 'Tech',
      excerpt: 'We compared the top family calendar apps so you don\'t have to. Here\'s what actually works for real families in 2026.',
      keywords: ['best family calendar app', 'family planner app', 'family calendar app UK', 'family app Switzerland'],
      metaDescription: 'Comparing the best family calendar apps of 2026: Cozi, FamilyWall, Google Calendar, and Eazy.Family. Find out which one actually works for your family.',
      body: `**What to look for in a family calendar app**

A calendar app for individuals and a calendar app for families are very different things. The family version needs to handle multiple people with different schedules, different levels of tech confidence, and different needs. It should be intuitive enough that even reluctant partners will actually use it. It should be private, not using your family's data to serve you ads. And in 2026, it probably should have some AI smarts built in.

With that in mind, here's how the main contenders stack up.

**Cozi — the established option**

Cozi has been around since 2007 and was one of the first apps built specifically for families. It does the basics well: a shared calendar, shopping lists, to-do lists, and a family journal. The problem? It shows its age. The interface feels dated compared to modern apps, the free version is ad-supported (and those ads appear in a family app, which feels intrusive), and there's no AI assistant. If you've been using Cozi for years, it's comfortable. But for anyone starting fresh in 2026, there are better options.

**FamilyWall — feature-rich but complex**

FamilyWall tries to do everything: calendar, messaging, location sharing, chore tracker, photo sharing, school agenda. On paper, impressive. In practice, the sheer number of features makes it harder to use. Onboarding is complex, the UI is crowded, and getting every family member up and running takes real effort. It also lacks a meaningful AI assistant. Power users may love it; everyone else may give up before they've got everyone set up.

**Google Calendar — a building block, not a complete solution**

Google Calendar is excellent at being a calendar. Shared calendars work well, cross-device sync is reliable, and everyone already has a Google account. But it's not a family app. There's no shared shopping list, no family messaging, no child-friendly view, no AI tailored to family life. You can build something workable by combining Google Calendar + Google Keep + a WhatsApp group — but you're back to the fragmentation problem we talked about in our other post.

**Eazy.Family — the 2026 all-in-one pick**

Eazy.Family is built from the ground up for modern family life. A shared calendar with per-person colour coding, real-time shopping and to-do lists, private family messaging, an AI assistant that understands family context, and multilingual support — all in one place, with no ads. It's particularly well-suited to **families in Switzerland and the UK** where multilingual households are common and privacy expectations are high. The interface is clean enough that even tech-reluctant family members get on board quickly.

**The verdict**

For most families in 2026, Eazy.Family is the strongest all-round choice. Cozi works if you're already embedded in it. Google Calendar works if you're prepared to cobble together a full solution yourself. FamilyWall is worth a look if you want maximum features and have the patience to set it up. But if you want something that just works, from day one, for every person in your household — Eazy.Family is the one we'd recommend.`,
    },

    {
      slug: 'reduce-mental-load-family',
      title: '10 Ways to Reduce the Mental Load at Home',
      date: '2026-01-15',
      readTime: '6 min',
      tag: 'Wellbeing',
      excerpt: 'The mental load isn\'t just about doing tasks — it\'s about remembering, planning, and anticipating everything. Here\'s how to share it properly.',
      keywords: ['mental load family', 'reduce mental load parenting', 'invisible load household', 'shared mental load'],
      metaDescription: '10 practical ways to reduce the mental load at home — from naming it honestly to using AI tools that take the admin off your plate.',
      body: `The mental load is real, and it's exhausting. It's not just the tasks — it's the constant background hum of knowing what needs to happen, when, and making sure it does. Dentist appointments, school photo deadlines, birthday presents, who's running out of their medication. It never switches off.

The good news: it can be shared. Not perfectly, not overnight, but meaningfully. Here's how.

**1. Name it honestly**

The first step is giving it a name. "I'm not just tired — I'm carrying the invisible management of this household." Naming the mental load makes it visible, and visible things can be redistributed. This conversation is worth having even if it's uncomfortable.

**2. Use one shared to-do list**

Not your own private list and a vague sense that your partner knows the other half. One list, shared in real time, that both of you can add to and tick off. When the list lives in one place, nobody can claim they didn't know it needed doing.

**3. Assign ownership, not just tasks**

There's a difference between "can you pick up milk?" and "you own the shopping." Task-by-task delegation still requires someone to remember to delegate. Domain ownership — you own the school admin, I own the household maintenance — reduces the cognitive overhead dramatically.

**4. Make a shared calendar non-negotiable**

Every appointment, class, commitment, and event goes in. Not eventually — immediately. A shared family calendar where nothing gets added to someone's schedule without it appearing for everyone is foundational. It removes the "I didn't know about that" problem entirely.

**5. Hold a weekly family review**

Fifteen minutes on Sunday. Look at the week ahead together. What's coming up? Who needs to be where? What do we need to prepare? This one habit prevents more Monday-morning chaos than almost anything else.

**6. Involve children early**

From age five or six, children can handle simple responsibilities. Knowing what they need to pack for school, putting their dish in the dishwasher, being aware of their own schedule — these habits build independence and, importantly, reduce the load on you. Start small and build over time.

**7. Create systems, not one-off decisions**

Every time you make a one-off decision — "what's for dinner tonight?" — you're spending mental energy. **Meal planning once a week** is a system. A default rotation of packed lunch options is a system. Systems replace repeated decisions with a single good one.

**8. Use AI to reduce admin friction**

In 2026, AI assistants can genuinely take things off your plate. Drafting the response to the school's permission slip request, suggesting a weekly meal plan based on what's in your calendar, reminding you that football kit needs washing the night before the game. This isn't laziness — it's intelligent delegation to a tool that doesn't need sleep.

**9. Audit and consolidate your apps**

Paradoxically, managing too many organisational tools creates mental load. If you're switching between five apps to stay on top of family life, the switching itself is a cost. Consolidating into one well-designed family hub — calendar, lists, messaging, AI — reduces the overhead of just using your tools.

**10. Celebrate sharing the load**

When your partner takes something off your plate without being asked, say thank you and mean it. When the kids manage their own morning routine, acknowledge it. The families that manage mental load well aren't perfect — they're just intentional about recognising effort and keeping the conversation going.

The mental load doesn't disappear. But it gets lighter when it's genuinely shared.`,
    },

    {
      slug: 'family-digital-hub-vs-group-chat',
      title: 'Why Your Family Needs a Digital Hub (Not Just a Group Chat)',
      date: '2026-04-02',
      readTime: '5 min',
      tag: 'Technology',
      excerpt: 'WhatsApp is great for a quick message. It\'s a terrible system for running a family. Here\'s what a proper digital family hub looks like.',
      keywords: ['family app UK', 'family hub app', 'family organisation app', 'family digital hub'],
      metaDescription: 'Why a WhatsApp group isn\'t enough for family organisation — and what a real digital family hub offers instead.',
      body: `**Why the WhatsApp group fails**

Let's be honest: the family WhatsApp group is where good intentions go to get buried. A message about the dentist appointment disappears under fifty "😂" reactions and a debate about where to go for Grandma's birthday. Someone posts the school play date as a message on Tuesday, and by Thursday nobody can find it.

The problem isn't the people — it's the tool. WhatsApp is a messaging app. It's brilliant at rapid back-and-forth conversation. But it has no calendar. It has no persistent list. It has no privacy controls (try explaining to a 9-year-old why they're in the same group chat as the adults). It has no AI assistant. And critically, it has no structure — everything is chronological, and chronological is the enemy of organisation.

**What a digital family hub actually contains**

A proper digital family hub is a different thing entirely. Think of it as a private, family-only platform that brings together everything you need to run household life:

**A shared calendar** that every family member can see, colour-coded by person, with events that sync automatically across all devices.

**Shared lists** — shopping, to-do, school supplies — that update in real time and can be checked off by whoever gets there first.

**Private family messaging** that's separate from your work WhatsApp, social Instagram DMs, and group chats. Conversation that stays in the family.

**AI assistance** tuned to family context — not just a general chatbot, but something that knows your family's schedule and can help you plan around it.

**Event planning** for family gatherings, holidays, and milestones, with RSVPs and reminders built in.

**The privacy question**

There's also a question worth asking: what does the platform do with your family's data? A WhatsApp group is Meta's infrastructure. A general-purpose calendar app may show you ads based on your events. A proper family hub should be private by design — your family's information stays with your family, not used to train models or serve targeted advertising.

**How to start small**

You don't have to overhaul everything at once. Start with the calendar — get every family member on the same shared calendar this week. Once that's working, add shared lists. Then messaging. Then explore what else the platform offers. The goal is a gradual consolidation, not a painful migration.

Families that make the switch from group-chat chaos to a proper digital hub consistently say the same thing: they can't believe they waited so long.`,
    },
  ],

  de: [
    {
      slug: 'familie-organisieren-2026',
      title: 'Familie organisieren: So klappt\'s 2026',
      date: '2026-03-12',
      readTime: '5 min',
      tag: 'Organisation',
      excerpt: 'Die meisten Familien jonglieren täglich mit sechs oder mehr Apps. Wir zeigen, wie man alles an einem Ort zusammenbringt und wirklich den Überblick behält.',
      keywords: ['Familienplaner App', 'Familie organisieren Schweiz', 'Familienorganisation App', 'Familien App'],
      metaDescription: 'Zu viele Apps, zu wenig Überblick? Mit diesen 3 Prinzipien und einem 4-Schritte-Plan organisieren Sie Ihr Familienleben 2026 endlich richtig.',
      body: `**Das Fragmentierungsproblem**

Frag eine Familie, welche Apps sie täglich nutzt, und die Liste wird schnell lang: ein Gruppen-Chat für die Koordination, ein Google-Kalender, den nur zwei von vier Familienmitgliedern wirklich nutzen, eine Einkaufslisten-App, eine Schul-App für Hausaufgaben und noch ein Fotoalbum. Mindestens sechs Tools — und trotzdem hängen überall Zettel am Kühlschrank.

Das Ergebnis ist kein echtes Organisieren, sondern organisiertes Chaos. Dinge fallen durch die Ritzen. Jemand hat die Nachricht nicht gesehen. Die Liste war nicht aktuell. Kommt Ihnen das bekannt vor?

**Drei Prinzipien, die alles verändern**

Familien, die wirklich den Überblick behalten, setzen auf drei einfache Prinzipien — nicht auf mehr Tools, sondern oft auf weniger.

**1. Zentralisierung.** Ein Ort für alles. Ein Kalender, den jedes Familienmitglied sehen kann. Eine Einkaufsliste, die sich in Echtzeit aktualisiert. Ein Ort für Nachrichten, an dem man weiss, dass sie angekommen sind.

**2. Transparenz.** Jeder in der Familie sollte sehen, was passiert — auf seinem Niveau. Kinder brauchen keine Tabellenkalkulation; sie brauchen zu wissen, was es zum Abendessen gibt und wann das Training beginnt. Eltern müssen die Wochenverpflichtungen auf einen Blick überblicken.

**3. Delegation.** Organisation sollte nicht an einer Person hängen. Die mentale Last ist real und schwer. Systeme, die es leicht machen, Aufgaben zuzuweisen und ohne Nachfragen zu verfolgen, sind die Systeme, die wirklich funktionieren.

**Ein praktischer 4-Schritte-Plan**

**Schritt 1:** Machen Sie eine Bestandsaufnahme aller Apps und Tools, die Ihre Familie nutzt. Welche helfen wirklich, welche erzeugen nur Lärm?

**Schritt 2:** Wählen Sie einen gemeinsamen Kalender — und halten Sie daran fest. Jedes Familienmitglied muss ihn auf dem Telefon haben, und Termine werden dort zuerst eingetragen.

**Schritt 3:** Konsolidieren Sie Ihre Listen. Einkauf, To-dos, Schultermine — alles in einen gemeinsamen Listenbereich. Echtzeit-Synchronisierung ist hier entscheidend.

**Schritt 4:** Etablieren Sie eine wöchentliche Familienroutine. Fünf Minuten am Sonntagabend, um die Woche gemeinsam durchzugehen, sind mehr wert als ein Dutzend hektischer Montagnachrichten.

**Der KI-Vorteil 2026**

Was 2026 neu ist: KI kann echte Organisationsarbeit übernehmen. Einen KI-Assistenten bitten, die wichtigsten Termine der Woche zusammenzustellen oder an den Schulsporttag zu erinnern — das ist kein Zukunftsszenario mehr.

Genau diese Lücke füllt **Eazy.Family**: ein privater, werbefreier Hub, in dem Kalender, Listen, Nachrichten und KI-Assistent gemeinsam wohnen — ohne den Lärm einer allgemeinen Plattform.`,
    },

    {
      slug: 'beste-familien-apps-2026',
      title: 'Die besten Familien-Apps 2026 im Vergleich',
      date: '2026-02-28',
      readTime: '5 min',
      tag: 'Technologie',
      excerpt: 'Wir haben die wichtigsten Familien-Apps 2026 verglichen — damit Sie es nicht müssen. Hier ist, was für echte Familien wirklich funktioniert.',
      keywords: ['beste Familien App', 'Familienkalender App', 'Familien App Schweiz', 'Familien Organizer App'],
      metaDescription: 'Cozi, FamilyWall, Google Kalender oder Eazy.Family? Wir vergleichen die besten Familien-Apps 2026 und zeigen, welche am besten passt.',
      body: `**Worauf es bei einer Familien-App ankommt**

Eine Kalender-App für Einzelpersonen und eine Familien-App sind grundverschieden. Die Familienversion muss mehrere Personen mit unterschiedlichen Zeitplänen verwalten, intuitiv genug sein, damit auch technikscheue Partner mitmachen, privat sein — ohne die Daten Ihrer Familie für Werbung zu nutzen — und 2026 idealerweise KI-Funktionen bieten.

**Cozi — die etablierte Option**

Cozi gibt es seit 2007 und war eine der ersten Apps für Familien. Die Grundfunktionen stimmen: gemeinsamer Kalender, Einkaufslisten, To-do-Listen. Das Problem? Das Interface wirkt veraltet, die Gratisversion enthält Werbung — in einer Familien-App — und ein KI-Assistent fehlt gänzlich.

**FamilyWall — funktionsreich, aber komplex**

FamilyWall versucht alles zu bieten: Kalender, Nachrichten, Standortfreigabe, Aufgabentracker, Fotofreigabe. In der Praxis macht die Fülle der Funktionen die App schwieriger zu bedienen. Das Onboarding ist aufwändig, die Benutzeroberfläche überladen, und alle Familienmitglieder einzurichten erfordert echte Geduld.

**Google Kalender — ein Baustein, kein Komplettpaket**

Google Kalender ist hervorragend als Kalender. Aber er ist keine Familien-App. Keine gemeinsame Einkaufsliste, kein Familien-Messaging, keine kindgerechte Ansicht, kein familientauglicher KI-Assistent. Man kann sich etwas zusammenstückeln — aber das Fragmentierungsproblem bleibt.

**Eazy.Family — die All-in-One-Empfehlung 2026**

Eazy.Family ist von Grund auf für das moderne Familienleben entwickelt: Farbcodierter gemeinsamer Kalender, Echtzeit-Listen, privates Familien-Messaging, KI-Assistent mit Familienkontext und Mehrsprachigkeit — alles ohne Werbung. Besonders gut geeignet für **Familien in der Schweiz und Deutschland**, wo Mehrsprachigkeit häufig und Datenschutz wichtig ist.

**Fazit:** Für die meisten Familien 2026 ist Eazy.Family die stärkste Gesamtlösung. Wer einfach anfangen möchte, ohne etwas zusammenstückeln zu müssen, ist hier richtig aufgehoben.`,
    },

    {
      slug: 'mentale-last-familie',
      title: 'Mentale Last in der Familie: 8 Wege zur Entlastung',
      date: '2026-01-15',
      readTime: '5 min',
      tag: 'Wohlbefinden',
      excerpt: 'Die mentale Last ist nicht nur das Erledigen von Aufgaben — es geht ums Erinnern, Planen und Antizipieren. Hier erfahren Sie, wie Sie sie ehrlich teilen können.',
      keywords: ['mentale Last Familie', 'mentale Last reduzieren', 'Familienalltag entlasten', 'mentale Belastung Eltern'],
      metaDescription: '8 praktische Wege, die mentale Last in der Familie zu reduzieren — vom offenen Gespräch bis zu KI-Tools, die den Verwaltungsaufwand übernehmen.',
      body: `Die mentale Last ist real — und erschöpfend. Es geht nicht nur um die Aufgaben, sondern um das ständige Hintergrundrauschen: Was muss wann passieren? Wer hat Zahnarzttermin? Wessen Sportzeug muss gewaschen werden? Es schaltet nie ab.

Die gute Nachricht: Sie kann geteilt werden. Nicht perfekt, nicht über Nacht — aber bedeutsam.

**1. Benennen Sie sie offen**

Geben Sie der Last einen Namen: "Ich trage die unsichtbare Verwaltung dieses Haushalts." Was sichtbar ist, kann verteilt werden. Dieses Gespräch lohnt sich, auch wenn es unbequem ist.

**2. Eine gemeinsame To-do-Liste**

Nicht Ihre private Liste und ein vages Gefühl, dass Ihr Partner den Rest kennt — eine Liste, die beide in Echtzeit sehen und abhaken können. Was in einer Liste steht, kann niemand mehr ignorieren.

**3. Verantwortungsbereiche, nicht Einzelaufgaben**

Es gibt einen Unterschied zwischen "Kannst du Milch kaufen?" und "Du bist für den Einkauf zuständig." Bereichsverantwortung — du kümmerst dich um die Schule, ich um das Haus — reduziert den Koordinationsaufwand erheblich.

**4. Gemeinsamer Kalender als Grundlage**

Jeder Termin, jede Verpflichtung gehört hinein — sofort, nicht irgendwann. Ein Familienkalender, in dem nichts eingetragen wird ohne dass alle es sehen, ist die Basis aller Organisation.

**5. Wöchentliche Familienrunde**

Fünfzehn Minuten am Sonntag: Was kommt diese Woche? Wer muss wo sein? Was müssen wir vorbereiten? Diese eine Gewohnheit verhindert mehr Montagschaos als fast alles andere.

**6. Kinder früh einbinden**

Ab fünf oder sechs Jahren können Kinder einfache Verantwortlichkeiten übernehmen. Das baut Selbstständigkeit auf und reduziert die Last der Eltern.

**7. Systeme statt Einzelentscheidungen**

Jede Einzelentscheidung — "Was gibt es heute Abend?" — kostet mentale Energie. Ein Wochenmenü, ein Rotationsplan für Mittagessen, feste Abläufe: Systeme ersetzen viele Einzelentscheidungen durch eine gute.

**8. KI für den Verwaltungsaufwand nutzen**

2026 können KI-Assistenten echte Verwaltungsaufgaben übernehmen: Wochenzusammenfassung, Erinnerungen, Terminvorbereitung. Das ist keine Faulheit — es ist intelligente Delegation an ein Tool, das nicht schläft.`,
    },

    {
      slug: 'familien-hub-vs-whatsapp',
      title: 'Warum ein Familien-Hub mehr bringt als eine WhatsApp-Gruppe',
      date: '2026-04-02',
      readTime: '4 min',
      tag: 'Technologie',
      excerpt: 'WhatsApp ist gut für schnelle Nachrichten. Als System für eine Familie ist es jedoch ungeeignet. Hier erfahren Sie, was ein echter digitaler Familien-Hub bietet.',
      keywords: ['Familien App Deutschland', 'WhatsApp Alternative Familie', 'digitale Familienverwaltung', 'Familien Hub'],
      metaDescription: 'Warum eine WhatsApp-Gruppe für die Familienorganisation nicht ausreicht — und was ein echter digitaler Familien-Hub stattdessen bietet.',
      body: `**Warum die WhatsApp-Gruppe scheitert**

Die Familien-WhatsApp-Gruppe ist der Ort, an dem gute Absichten begraben werden. Eine Nachricht über den Zahnarzttermin verschwindet unter einem Dutzend Emoji-Reaktionen und einer Diskussion über Omas Geburtstagsfeier. Jemand postet am Dienstag eine Info über den Schulausflug — am Donnerstag findet sie niemand mehr.

Das Problem ist nicht die Familie — es ist das Tool. WhatsApp ist für schnelle, chronologische Konversation gemacht. Es hat keinen Kalender. Keine persistenten Listen. Keine Datenschutzkontrolle — erklären Sie einem 9-Jährigen, warum er im gleichen Chat wie die Erwachsenen ist. Und keinen KI-Assistenten.

**Was ein digitaler Familien-Hub enthält**

Ein echter Familien-Hub ist etwas ganz anderes: eine private, familieninterne Plattform mit allem, was Sie brauchen:

**Ein gemeinsamer Kalender**, der für alle sichtbar ist, farbkodiert nach Person, mit automatischer Synchronisierung auf allen Geräten.

**Gemeinsame Listen** — Einkauf, To-dos, Schulmaterial —, die sich in Echtzeit aktualisieren und von wem auch immer abgehakt werden können, der zuerst dran ist.

**Privates Familien-Messaging**, getrennt von Arbeits-WhatsApp und Social-Media-Chats.

**KI-Unterstützung** mit Familienkontext — kein allgemeiner Chatbot, sondern etwas, das den Kalender Ihrer Familie kennt.

**Die Datenschutzfrage**

Was passiert mit den Daten Ihrer Familie? Eine WhatsApp-Gruppe läuft auf Metas Infrastruktur. Eine allgemeine Kalender-App zeigt Ihnen möglicherweise Werbung basierend auf Ihren Terminen. Ein echter Familien-Hub sollte datenschutzorientiert sein — Ihre Familiendaten bleiben bei Ihrer Familie.

**Klein anfangen**

Sie müssen nicht alles auf einmal umstellen. Beginnen Sie mit dem Kalender. Dann Listen. Dann Messaging. Familien, die diesen Wechsel machen, sagen immer das Gleiche: Sie können nicht glauben, dass sie so lange gewartet haben.`,
    },
  ],

  fr: [
    {
      slug: 'organiser-vie-famille-2026',
      title: 'Comment organiser la vie de famille en 2026',
      date: '2026-03-12',
      readTime: '5 min',
      tag: 'Organisation',
      excerpt: 'La plupart des familles jonglent avec six applications ou plus pour s\'en sortir. Voici comment tout regrouper en un seul endroit et reprendre le contrôle.',
      keywords: ['application famille organisation', 'organiser famille application', 'agenda familial partagé', 'app famille Suisse'],
      metaDescription: 'Trop d\'applications pour gérer la vie de famille ? Découvrez 3 principes et un plan en 4 étapes pour mieux vous organiser en 2026.',
      body: `**Le problème de la fragmentation**

Demandez à une famille quelles applications elle utilise au quotidien et la liste s'allonge vite : un groupe de discussion pour la coordination, un agenda Google que deux membres sur quatre consultent vraiment, une application de listes de courses, une application scolaire pour les devoirs, une application de planification des repas… Six outils au minimum. Et les post-it sur le réfrigérateur ne sont pas comptés.

Le résultat ? Pas de l'organisation, mais du chaos organisé. Des choses passent à travers les mailles. Quelqu'un n'a pas vu le message. La liste n'était pas à jour. Ça vous parle ?

**Trois principes qui changent tout**

Les familles qui se sentent vraiment en contrôle fonctionnent généralement selon trois principes simples — pas avec plus d'outils, souvent avec moins.

**1. La centralisation.** Un seul endroit pour tout. Un calendrier que chaque membre de la famille peut voir. Une liste de courses mise à jour en temps réel. Un endroit pour envoyer des messages avec la certitude qu'ils sont reçus.

**2. La visibilité.** Chacun dans la famille doit voir ce qui se passe — à son niveau. Les enfants n'ont pas besoin d'un tableau de bord complexe ; ils ont besoin de savoir ce qu'il y a à dîner et quand commence l'entraînement. Les parents doivent voir les engagements de la semaine d'un coup d'œil.

**3. La délégation.** L'organisation ne devrait pas reposer sur une seule personne. La charge mentale est réelle et lourde. Les systèmes qui permettent d'assigner des tâches et d'en suivre l'avancement sans relancer personne — ce sont ceux qui durent.

**Un plan pratique en 4 étapes**

**Étape 1 :** Faites un inventaire de toutes les applications et outils utilisés par votre famille. Lesquels apportent vraiment de la valeur ?

**Étape 2 :** Choisissez un seul calendrier partagé. Pas deux, pas un compromis entre Google et Apple — un seul. Assurez-vous que chaque membre de la famille l'a sur son téléphone.

**Étape 3 :** Consolidez vos listes. Courses, tâches, délais scolaires — rassemblez-les dans un seul espace partagé avec synchronisation en temps réel.

**Étape 4 :** Instaurez un rythme familial hebdomadaire. Cinq minutes le dimanche soir pour passer en revue la semaine à venir valent mieux qu'une dizaine de messages stressants le lundi matin.

**L'avantage de l'IA en 2026**

En 2026, l'IA peut prendre en charge une partie du travail organisationnel. Demander à un assistant IA de récapituler les événements clés de la semaine ou de rappeler les délais scolaires — ce n'est plus de la science-fiction.

C'est exactement le vide que comble **Eazy.Family** : un hub privé, sans publicité, où calendrier, listes, messagerie et assistant IA coexistent — sans le bruit d'une plateforme généraliste.`,
    },

    {
      slug: 'meilleures-applications-famille-2026',
      title: 'Les meilleures applications famille en 2026',
      date: '2026-02-28',
      readTime: '5 min',
      tag: 'Technologie',
      excerpt: 'Nous avons comparé les principales applications famille de 2026 pour vous. Voici ce qui fonctionne vraiment pour les familles réelles.',
      keywords: ['meilleure app famille', 'application calendrier familial', 'application famille France Suisse', 'organiser famille app'],
      metaDescription: 'Cozi, FamilyWall, Google Agenda ou Eazy.Family ? Notre comparatif des meilleures applications famille 2026 pour vous aider à choisir.',
      body: `**Ce qu'il faut chercher dans une application famille**

Une application calendrier pour individus et une application pour famille sont deux choses très différentes. La version familiale doit gérer plusieurs personnes avec des emplois du temps différents, être assez intuitive pour que même les membres peu technophiles l'adoptent, respecter la vie privée — sans utiliser les données de votre famille pour afficher des publicités — et, en 2026, intégrer idéalement des fonctionnalités d'IA.

**Cozi — l'option établie**

Cozi existe depuis 2007 et fut l'une des premières applications conçues pour les familles. Les fonctions de base sont là : calendrier partagé, listes de courses, to-do lists. Le problème ? L'interface vieillit, la version gratuite est financée par la publicité — dans une application familiale, c'est intrusif — et il n'y a pas d'assistant IA.

**FamilyWall — riche en fonctionnalités, mais complexe**

FamilyWall essaie de tout faire : calendrier, messagerie, partage de localisation, suivi des tâches, partage de photos. En pratique, la multitude de fonctionnalités rend l'application plus difficile à utiliser. L'intégration est complexe et faire adopter l'application à tous les membres de la famille demande un effort réel.

**Google Agenda — une brique, pas une solution complète**

Google Agenda est excellent en tant que calendrier. Mais ce n'est pas une application famille. Pas de liste de courses partagée, pas de messagerie familiale, pas d'assistant IA adapté à la vie de famille. On peut bricoler une solution en combinant Google Agenda + Google Keep + un groupe WhatsApp — mais on revient au problème de la fragmentation.

**Eazy.Family — le choix tout-en-un 2026**

Eazy.Family a été conçu de zéro pour la vie de famille moderne : calendrier partagé avec code couleur par personne, listes en temps réel, messagerie familiale privée, assistant IA avec contexte familial, et support multilingue — le tout sans publicité. Particulièrement adapté aux **familles en Suisse et en France** où le multilinguisme est courant et les exigences en matière de confidentialité sont élevées.

**Le verdict :** Pour la plupart des familles en 2026, Eazy.Family est le choix le plus complet. Si vous voulez quelque chose qui fonctionne dès le premier jour pour chaque membre de votre foyer, c'est notre recommandation.`,
    },

    {
      slug: 'charge-mentale-famille',
      title: 'Charge mentale en famille : 10 façons de la répartir',
      date: '2026-01-15',
      readTime: '5 min',
      tag: 'Bien-être',
      excerpt: 'La charge mentale, ce n\'est pas seulement faire des tâches — c\'est se souvenir, planifier et anticiper tout. Voici comment la partager vraiment.',
      keywords: ['charge mentale famille', 'réduire charge mentale', 'partager charge mentale', 'charge invisible parents'],
      metaDescription: '10 façons concrètes de répartir la charge mentale en famille — de la nommer honnêtement à utiliser l\'IA pour alléger l\'administratif.',
      body: `La charge mentale est réelle et épuisante. Ce ne sont pas seulement les tâches — c'est le bourdonnement constant en arrière-plan : qui a rendez-vous chez le médecin ? Les affaires de sport ont-elles été lavées ? Ça ne s'éteint jamais.

La bonne nouvelle : elle peut se partager. Pas parfaitement, pas du jour au lendemain — mais réellement.

**1. Nommez-la honnêtement**

La première étape est de lui donner un nom. "Je ne suis pas seulement fatiguée — je porte la gestion invisible de ce foyer." Ce qui est visible peut être redistribué.

**2. Une seule liste de tâches partagée**

Pas votre propre liste privée et un vague sentiment que votre partenaire connaît le reste — une liste partagée en temps réel que vous pouvez tous les deux alimenter et cocher.

**3. Des domaines de responsabilité, pas juste des tâches**

Il y a une différence entre "tu peux acheter du lait ?" et "tu t'occupes des courses." La responsabilité de domaine — tu gères l'administratif scolaire, je gère la maison — réduit considérablement la charge cognitive.

**4. Un calendrier partagé, non négociable**

Chaque rendez-vous, chaque activité entre dedans — immédiatement. Un calendrier familial où rien n'est ajouté sans que tout le monde le voie est fondamental.

**5. Un bilan hebdomadaire en famille**

Quinze minutes le dimanche. Regardez la semaine à venir ensemble. Qui doit être où ? Qu'est-ce qu'on doit préparer ? Cette habitude prévient plus de chaos du lundi matin que presque tout le reste.

**6. Impliquer les enfants tôt**

Dès cinq ou six ans, les enfants peuvent assumer de petites responsabilités. Cela construit l'autonomie et réduit votre charge.

**7. Des systèmes, pas des décisions au cas par cas**

Chaque décision ponctuelle — "qu'est-ce qu'on mange ce soir ?" — coûte de l'énergie mentale. Un menu de la semaine, une rotation de repas : les systèmes remplacent de nombreuses décisions par une seule bonne.

**8. Utiliser l'IA pour réduire l'administratif**

En 2026, les assistants IA peuvent vraiment prendre des tâches en charge : résumé de semaine, rappels, préparation de rendez-vous. Ce n'est pas de la paresse — c'est une délégation intelligente.

**9. Auditer et consolider vos applications**

Paradoxalement, gérer trop d'outils organisationnels crée de la charge mentale. Consolider dans un hub familial bien conçu réduit le coût cognitif de simplement utiliser vos outils.

**10. Célébrer le partage**

Quand votre partenaire prend quelque chose en charge sans qu'on le lui demande, remerciez-le sincèrement. Les familles qui gèrent bien la charge mentale ne sont pas parfaites — elles sont juste intentionnelles.`,
    },

    {
      slug: 'hub-numerique-famille',
      title: 'Pourquoi votre famille a besoin d\'un hub numérique',
      date: '2026-04-02',
      readTime: '4 min',
      tag: 'Technologie',
      excerpt: 'WhatsApp est parfait pour un message rapide. C\'est un terrible système pour gérer une famille. Voici à quoi ressemble un vrai hub numérique familial.',
      keywords: ['app famille hub numérique', 'organisation famille numérique', 'WhatsApp famille alternative', 'hub famille application'],
      metaDescription: 'Pourquoi un groupe WhatsApp ne suffit pas pour organiser une famille — et ce qu\'un vrai hub numérique familial offre à la place.',
      body: `**Pourquoi le groupe WhatsApp échoue**

Soyons honnêtes : le groupe WhatsApp familial est l'endroit où les bonnes intentions vont se noyer. Un message sur le rendez-vous chez le dentiste disparaît sous des dizaines de réactions emoji et un débat sur le restaurant pour l'anniversaire de grand-mère. Quelqu'un poste une info sur la sortie scolaire mardi — le jeudi, personne ne la retrouve.

Le problème n'est pas les gens — c'est l'outil. WhatsApp est une application de messagerie. Pas de calendrier. Pas de liste persistante. Pas de contrôles de confidentialité adaptés aux enfants. Pas d'assistant IA. Et surtout, pas de structure — tout est chronologique, et le chronologique est l'ennemi de l'organisation.

**Ce que contient un hub numérique familial**

Un vrai hub numérique familial est une plateforme privée, réservée à la famille, qui rassemble tout ce dont vous avez besoin :

**Un calendrier partagé** visible par tous, codé par couleur par personne, synchronisé automatiquement sur tous les appareils.

**Des listes partagées** — courses, tâches, fournitures scolaires — mises à jour en temps réel.

**Une messagerie familiale privée**, séparée de votre WhatsApp professionnel et de vos DMs sur les réseaux sociaux.

**Une assistance IA** adaptée au contexte familial — pas un chatbot générique, mais quelque chose qui connaît l'agenda de votre famille.

**La question de la confidentialité**

Que fait la plateforme avec les données de votre famille ? Un groupe WhatsApp tourne sur l'infrastructure de Meta. Un hub familial bien conçu doit être privé par conception — les informations de votre famille restent dans votre famille, non utilisées pour de la publicité ciblée.

**Commencer petit**

Vous n'avez pas à tout changer d'un coup. Commencez par le calendrier. Puis les listes. Puis la messagerie. Les familles qui font ce changement disent toutes la même chose : elles n'arrivent pas à croire qu'elles ont attendu si longtemps.`,
    },
  ],

  it: [
    {
      slug: 'organizzare-vita-familiare-2026',
      title: 'Come organizzare la vita familiare nel 2026',
      date: '2026-03-12',
      readTime: '5 min',
      tag: 'Organizzazione',
      excerpt: 'La maggior parte delle famiglie gestisce sei o più app solo per andare avanti. Ecco come riunire tutto in un unico posto e sentirsi davvero organizzati.',
      keywords: ['app famiglia organizzazione', 'organizzare famiglia app', 'pianificatore famiglia', 'app famiglia Italia Svizzera'],
      metaDescription: 'Troppe app per gestire la vita familiare? Scopri 3 principi e un piano in 4 passi per organizzarti meglio nel 2026.',
      body: `**Il problema della frammentazione**

Chiedi a una famiglia quali app usa ogni giorno e la lista diventa lunga in fretta: una chat di gruppo per la coordinazione, un Google Calendar che solo due membri su quattro controllano davvero, un'app per la lista della spesa, un'app scolastica per i compiti, un'app di pianificazione pasti... Almeno sei strumenti. E i post-it sul frigorifero non sono contati.

Il risultato? Non è organizzazione, è caos organizzato. Le cose cadono nelle crepe. Qualcuno non ha visto il messaggio. La lista non era aggiornata. Vi suona familiare?

**Tre principi che cambiano tutto**

Le famiglie che si sentono davvero in controllo tendono a seguire tre semplici principi — non usando più strumenti, spesso usando meno.

**1. Centralizzazione.** Un unico posto per tutto. Un calendario che ogni membro della famiglia può vedere. Una lista della spesa che si aggiorna in tempo reale. Un posto per i messaggi dove si sa che sono stati ricevuti.

**2. Visibilità.** Ognuno in famiglia dovrebbe vedere cosa succede — al proprio livello. I bambini non hanno bisogno di un foglio di calcolo; hanno bisogno di sapere cosa c'è per cena e quando inizia l'allenamento. I genitori devono vedere gli impegni della settimana a colpo d'occhio.

**3. Delega.** L'organizzazione non dovrebbe ricadere su una sola persona. Il carico mentale è reale e pesante. I sistemi che rendono facile assegnare compiti e seguirne l'avanzamento senza dover rincorrere nessuno — quelli sono i sistemi che funzionano davvero.

**Un piano pratico in 4 passi**

**Passo 1:** Fai un inventario di tutte le app e gli strumenti che la tua famiglia usa. Quali aggiungono davvero valore?

**Passo 2:** Scegli un unico calendario condiviso. Non due, non un compromesso — uno solo. Assicurati che ogni membro della famiglia lo abbia sul telefono.

**Passo 3:** Consolida le tue liste. Spesa, cose da fare, scadenze scolastiche — tutto in un unico spazio condiviso con sincronizzazione in tempo reale.

**Passo 4:** Stabilisci un ritmo familiare settimanale. Cinque minuti la domenica sera per rivedere insieme la settimana valgono più di dieci messaggi stressanti il lunedì mattina.

**Il vantaggio dell'IA nel 2026**

Nel 2026, l'IA può occuparsi di parte del lavoro organizzativo. Chiedere a un assistente IA di riassumere gli eventi chiave della settimana o ricordare le scadenze scolastiche — non è più fantascienza.

È esattamente il vuoto che **Eazy.Family** è progettata per riempire: un hub privato, senza pubblicità, dove calendario, liste, messaggi e assistente IA vivono insieme — senza il rumore di una piattaforma generalista.`,
    },

    {
      slug: 'migliori-app-famiglie-2026',
      title: 'Le migliori app per famiglie del 2026',
      date: '2026-02-28',
      readTime: '5 min',
      tag: 'Tecnologia',
      excerpt: 'Abbiamo confrontato le principali app per famiglie del 2026 per voi. Ecco cosa funziona davvero per le famiglie reali.',
      keywords: ['migliore app famiglia', 'app calendario famiglia', 'organizzatore famiglia app', 'app famiglia svizzera'],
      metaDescription: 'Cozi, FamilyWall, Google Calendar o Eazy.Family? Il nostro confronto delle migliori app per famiglie del 2026.',
      body: `**Cosa cercare in un'app per famiglie**

Un'app calendario per individui e un'app per famiglie sono cose molto diverse. La versione familiare deve gestire più persone con orari diversi, essere abbastanza intuitiva da far adottare anche ai membri meno tecnologici, rispettare la privacy — senza usare i dati della famiglia per pubblicità — e nel 2026 integrare idealmente funzionalità di IA.

**Cozi — l'opzione consolidata**

Cozi esiste dal 2007 ed è stata una delle prime app pensate per le famiglie. Le funzioni di base ci sono: calendario condiviso, liste della spesa, to-do list. Il problema? L'interfaccia mostra l'età, la versione gratuita è finanziata dalla pubblicità — in un'app familiare è invasivo — e non c'è un assistente IA.

**FamilyWall — ricco di funzioni, ma complesso**

FamilyWall cerca di fare tutto: calendario, messaggistica, condivisione posizione, tracciamento compiti, condivisione foto. In pratica, la moltitudine di funzioni rende l'app più difficile da usare. L'onboarding è complesso e far adottare l'app a tutti i membri della famiglia richiede un vero sforzo.

**Google Calendar — un mattone, non una soluzione completa**

Google Calendar è eccellente come calendario. Ma non è un'app famiglia. Nessuna lista della spesa condivisa, nessuna messaggistica familiare, nessuna assistente IA adattata alla vita di famiglia. Si può mettere insieme qualcosa combinando più strumenti — ma si torna al problema della frammentazione.

**Eazy.Family — la scelta all-in-one del 2026**

Eazy.Family è stata costruita da zero per la vita di famiglia moderna: calendario condiviso con codice colore per persona, liste in tempo reale, messaggistica familiare privata, assistente IA con contesto familiare e supporto multilingue — il tutto senza pubblicità. Particolarmente adatta alle **famiglie in Svizzera e in Italia** dove il multilinguismo è comune e le aspettative sulla privacy sono elevate.

**Il verdetto:** Per la maggior parte delle famiglie nel 2026, Eazy.Family è la scelta più completa. Se vuoi qualcosa che funzioni dal primo giorno per ogni membro della tua famiglia, è quello che consigliamo.`,
    },

    {
      slug: 'carico-mentale-famiglia',
      title: 'Come ridurre il carico mentale in famiglia',
      date: '2026-01-15',
      readTime: '4 min',
      tag: 'Benessere',
      excerpt: 'Il carico mentale non riguarda solo fare i compiti — è ricordare, pianificare e anticipare tutto. Ecco come condividerlo davvero.',
      keywords: ['carico mentale famiglia', 'ridurre carico mentale', 'gestione famiglia stress', 'carico invisibile genitori'],
      metaDescription: 'Come ridurre il carico mentale in famiglia con 8 strategie pratiche — dal nominarlo onestamente all\'usare l\'IA per alleggerire l\'amministrativo.',
      body: `Il carico mentale è reale e sfiancante. Non sono solo i compiti — è il ronzio costante in sottofondo: chi ha il dentista? Le scarpe da ginnastica sono state lavate? Non si spegne mai.

La buona notizia: può essere condiviso. Non perfettamente, non dall'oggi al domani — ma in modo significativo.

**1. Nominatelo onestamente**

Il primo passo è dargli un nome. "Non sono solo stanca — porto la gestione invisibile di questa famiglia." Ciò che è visibile può essere ridistribuito.

**2. Una sola lista di cose da fare condivisa**

Non la tua lista privata e un vago senso che il tuo partner conosca il resto — una lista condivisa in tempo reale che entrambi potete aggiornare e spuntare.

**3. Responsabilità di dominio, non solo compiti singoli**

C'è una differenza tra "puoi comprare il latte?" e "tu ti occupi della spesa." La responsabilità di dominio riduce enormemente il carico cognitivo di coordinazione.

**4. Un calendario condiviso, non negoziabile**

Ogni appuntamento, ogni attività entra subito nel calendario. Un calendario familiare dove nulla viene aggiunto senza che tutti lo vedano è la base di ogni organizzazione.

**5. Una revisione settimanale in famiglia**

Quindici minuti la domenica. Guardate insieme la settimana che viene. Chi deve essere dove? Cosa dobbiamo preparare? Questa abitudine previene più caos del lunedì mattina di quasi qualsiasi altra cosa.

**6. Coinvolgere i bambini presto**

Dai cinque o sei anni, i bambini possono assumersi piccole responsabilità. Questo costruisce autonomia e riduce il vostro carico.

**7. Sistemi, non decisioni singole**

Ogni decisione puntuale — "cosa mangiamo stasera?" — costa energia mentale. Un menu settimanale, una rotazione di pasti: i sistemi sostituiscono molte decisioni con una sola buona.

**8. Usare l'IA per ridurre l'amministrativo**

Nel 2026, gli assistenti IA possono occuparsi di veri compiti di gestione: riassunto della settimana, promemoria, preparazione appuntamenti. Non è pigrizia — è delega intelligente a uno strumento che non ha bisogno di dormire.`,
    },

    {
      slug: 'hub-digitale-famiglia',
      title: 'Perché la tua famiglia ha bisogno di un hub digitale',
      date: '2026-04-02',
      readTime: '4 min',
      tag: 'Tecnologia',
      excerpt: 'WhatsApp è ottimo per un messaggio veloce. È un pessimo sistema per gestire una famiglia. Ecco come appare un vero hub digitale familiare.',
      keywords: ['app famiglia hub digitale', 'alternativa WhatsApp famiglia', 'organizzazione famiglia digitale', 'hub famiglia app'],
      metaDescription: 'Perché un gruppo WhatsApp non basta per organizzare una famiglia — e cosa offre invece un vero hub digitale familiare.',
      body: `**Perché il gruppo WhatsApp fallisce**

Siamo onesti: il gruppo WhatsApp di famiglia è il posto dove le buone intenzioni vanno a perdersi. Un messaggio sul dentista sparisce sotto decine di reazioni emoji e un dibattito sul ristorante per il compleanno della nonna. Qualcuno posta un'info sulla gita scolastica di martedì — il giovedì nessuno la trova più.

Il problema non sono le persone — è lo strumento. WhatsApp è un'app di messaggistica. Nessun calendario. Nessuna lista persistente. Nessun controllo sulla privacy adatto ai bambini. Nessun assistente IA. E soprattutto, nessuna struttura — tutto è cronologico, e il cronologico è il nemico dell'organizzazione.

**Cosa contiene un hub digitale familiare**

Un vero hub digitale familiare è una piattaforma privata, riservata alla famiglia, che riunisce tutto ciò di cui hai bisogno:

**Un calendario condiviso** visibile da tutti, codificato per colore per persona, sincronizzato automaticamente su tutti i dispositivi.

**Liste condivise** — spesa, cose da fare, materiale scolastico — aggiornate in tempo reale.

**Messaggistica familiare privata**, separata dal tuo WhatsApp di lavoro e dai tuoi DM sui social.

**Assistenza IA** adattata al contesto familiare — non un chatbot generico, ma qualcosa che conosce l'agenda della tua famiglia.

**La questione della privacy**

Cosa fa la piattaforma con i dati della tua famiglia? Un gruppo WhatsApp gira sull'infrastruttura di Meta. Un hub familiare ben progettato deve essere privato per design — le informazioni della tua famiglia restano nella tua famiglia.

**Iniziare in piccolo**

Non devi cambiare tutto in una volta. Inizia con il calendario. Poi le liste. Poi la messaggistica. Le famiglie che fanno questo cambiamento dicono tutte la stessa cosa: non riescono a credere di aver aspettato così a lungo.`,
    },
  ],
};

// ─────────────────────────────────────────────
// PARENTING ARTICLES
// ─────────────────────────────────────────────

export const PARENTING_ARTICLES: Record<Lang, ParentingArticle[]> = {

  en: [
    {
      slug: 'family-morning-routine',
      title: 'The Family Morning Routine That Actually Works',
      tag: 'Routine',
      excerpt: 'Mornings don\'t have to be chaos. A few structural tweaks — not superhuman willpower — are all it takes to make them work.',
      body: `Mornings are where family life either flows or falls apart. The good news is that it's almost never a people problem — it's a system problem. And systems can be fixed.

**Build in a 15-minute wake buffer**

Whatever time you think you need to be out the door, add 15 minutes. Not because you'll use it all, but because the days you need it — the missing shoe, the forgotten note, the unexpected tantrum — you'll be so glad it's there. That buffer is your stress insurance.

**Prep the night before, always**

The single biggest lever you can pull is the night before. Bags packed. Clothes chosen (even laid out). Lunches made or at least planned. Anything that can be decided at 8pm should not be decided at 7am. Make it a rule and stick to it.

**Give kids a visual schedule**

Young children, especially under 8, don't process verbal sequences well at speed. A simple visual schedule on the wall — wake up, get dressed, breakfast, teeth, shoes, out — gives them something to follow without needing you to narrate every step. It shifts the authority from you to the system, which reduces conflict dramatically.

**One job per person**

Everyone in the family has one morning job that is unambiguously theirs. One child empties the dishwasher while another makes their bed. One parent makes coffee, the other manages the school bags. Nobody is waiting on anyone else — everyone is contributing simultaneously.

**Screens off until everyone's ready**

This one is non-negotiable in the families that make it work. No phones, no tablets, no TV until every person is dressed, fed, and ready. Screen time is the finish line, not the waiting room. Use it as motivation, not distraction.

**Anchor the routine to a playlist or timer**

Rather than you being the clock — "it's time to brush teeth!", "we leave in five minutes!" — let a tool do it. A playlist that's always the same length, or a visual timer on the kitchen counter, externalises the time pressure. When the playlist ends, you leave. No argument with a parent, just the playlist.

The best morning routine isn't the most elaborate one — it's the one everyone can actually do without thinking about it.`,
    },

    {
      slug: 'family-command-centre',
      title: 'How to Create a Family Command Centre at Home',
      tag: 'Organisation',
      excerpt: 'A family command centre is the one place in your home where everything important lives. Here\'s how to build one that actually gets used.',
      body: `A family command centre sounds grand. It isn't, really — it's just the designated spot where your family's organisational life lives. One place where you go to know what's happening, what needs doing, and what's coming up. The magic is in the designation itself: when everyone knows where to look, information stops getting lost.

**What goes in it**

The core elements are: a **shared calendar** (the week's key events visible to everyone), a **to-do board** (tasks that need doing around the house or for school), a **weekly menu** (what's for dinner, so nobody asks again), and an **inbox** for anything physical — school letters, permission slips, things that need action.

You don't need all of these from day one. Start with one — the calendar, or the to-do board — and add the rest over time.

**Where to put it**

The kitchen is usually best. It's the room everyone passes through multiple times a day. A hallway works if it's the main thoroughfare. The key is: it has to be somewhere you naturally look, not a corner you have to make an effort to visit.

**Physical or digital?**

Both work. A physical command centre — a large magnetic whiteboard on the wall — has the advantage of being always visible. You don't need to unlock anything. A digital command centre (an app like Eazy.Family) has the advantage of being accessible anywhere — on your phone at the supermarket, at your desk at work, in bed on Sunday night when you're planning the week.

The best setup for many families is both: a physical board for the immediate week, and a digital hub for everything that needs to be accessible remotely or updated in real time.

**The rule that makes it work**

A command centre only works if information goes there first and every family member knows it. Set the rule early: any appointment, any deadline, any piece of information that affects the family goes on the board before it goes anywhere else. It takes two weeks to become a habit; once it is, it runs itself.`,
    },

    {
      slug: 'screen-time-rules-that-work',
      title: 'Screen Time Rules That Parents and Kids Both Accept',
      tag: 'Wellbeing',
      excerpt: 'Screen time battles are exhausting. These rules actually hold because they\'re consistent, fair, and explained — not just imposed.',
      body: `Screen time is one of the most argued-about topics in family life right now. The reason most screen time rules fail isn't that parents are too lenient — it's that the rules are inconsistent, unexplained, or feel arbitrary to children. The rules that hold are the ones everyone understands, and that parents follow too.

**No screens before school**

Simple, non-negotiable, applies to everyone. The morning is for getting ready, not for YouTube. When there's no exception — even on weekends, even for just five minutes — children stop asking. Consistency is what kills the argument.

**Screens on only after homework is done**

Not negotiable, not "almost done," not "just checking something." Done means done. This rule also helpfully motivates homework completion in a way that lecturing never does. Link the reward to the behaviour you want.

**Screens off one hour before bed**

This is a health rule as much as a boundary rule. Blue light affects sleep quality, and sleep affects literally everything else. Frame it this way to children: "We put screens away so your brain can wind down." A consistent wind-down routine — reading, talking, a calm activity — makes sleep noticeably better for most children within a week.

**Family movie night as a reward, not a right**

There's a difference between passive screen consumption as a default and a deliberately chosen family activity. A Friday evening film together is a treat. Screens all evening because nobody has decided otherwise is just drift. The distinction matters for children's relationship with media.

**Model the behaviour yourself**

Children observe everything. If you're on your phone during dinner, the rule about phones at dinner doesn't really exist — it's just a rule for them. If you want your children to put screens away, you have to do it first.

**Use apps, not willpower**

Parental control tools — built into iOS, Android, and most routers — take the enforcement off you and put it on the technology. You're not the bad guy; the timer is. Use them. Adjust as your children get older and earn more autonomy. The goal is self-regulation, not permanent restriction.`,
    },

    {
      slug: 'teaching-kids-to-manage-time',
      title: 'Teaching Children to Manage Their Own Time (By Age)',
      tag: 'Development',
      excerpt: 'The goal isn\'t obedient children — it\'s independent ones. Here\'s how to hand over time management gradually, by age, so it actually sticks.',
      body: `One of the most useful things you can give your child is the ability to manage their own time. Not just for your sanity — though that's a real benefit — but because self-management is a foundational life skill that most schools don't explicitly teach.

The mistake parents make is expecting children to suddenly "be responsible" around age 12 or 13, when the groundwork should have been laid years earlier. Here's how to do it progressively.

**Ages 5–7: Visual schedules and simple lists**

At this age, children need external structure they can see. A visual schedule — pictures more than words — showing the sequence of their day is incredibly effective. Morning: wake, dress, breakfast, teeth, school. Evening: homework, dinner, bath, story, sleep. They can tick off each step themselves, which gives them agency and satisfaction.

A simple to-do list with pictures (not just words) lets them take ownership of small tasks: put lunchbox in sink, put shoes away, put school bag by the door. Keep it to 3–4 items maximum. The habit matters more than the quantity.

**Ages 8–10: Their own digital calendar and homework planner**

At this age, children can handle a digital calendar — especially if they can see it on a device they already use. Add their activities, sports sessions, and homework deadlines. Show them how to add things themselves. A homework planner (physical or digital) becomes their tool, not yours. Your job is to check in, not to manage for them.

The key shift here: stop reminding them about things they have written down. Let the natural consequence of forgetting happen (within reason). The lesson is more powerful than any reminder.

**Ages 11 and up: Full calendar access and their own reminder system**

By 11 or 12, most children can manage their full schedule if given the tools and the expectation. A shared family calendar where they can see their commitments alongside the family's. Their own reminders set by them for homework deadlines, sports kit, project due dates.

Your role becomes mentor, not manager. You're there to help when they get stuck, not to orchestrate. The result, over time, is a teenager who knows where they need to be and what they need to bring — and who asks for help when they need it, rather than waiting to be organised.`,
    },
  ],

  de: [
    {
      slug: 'morgenroutine-familie',
      title: 'Die Morgenroutine, die wirklich funktioniert',
      tag: 'Routine',
      excerpt: 'Morgen müssen kein Chaos sein. Ein paar strukturelle Anpassungen — kein übermenschlicher Wille — reichen aus, damit alles klappt.',
      body: `Morgen entscheiden, ob der Familienalltag fließt oder aus den Fugen gerät. Die gute Nachricht: Es liegt fast nie an den Menschen — es liegt am System. Und Systeme lassen sich verbessern.

**15-Minuten-Puffer einplanen**

Egal, wann Sie denken, dass Sie das Haus verlassen müssen — planen Sie 15 Minuten extra ein. Nicht weil Sie sie immer brauchen, sondern weil Sie an den Tagen, an denen der Schuh fehlt oder der Brief unterschrieben werden muss, so froh darüber sind.

**Vorbereitung am Abend zuvor**

Der größte Hebel ist der Abend davor. Taschen gepackt. Kleidung ausgewählt und hingelegt. Brotdosen fertig. Alles, was um 20 Uhr entschieden werden kann, sollte nicht um 7 Uhr entschieden werden. Machen Sie es zur Regel und halten Sie daran fest.

**Kinder brauchen einen visuellen Ablaufplan**

Kleine Kinder unter 8 Jahren verarbeiten verbale Sequenzen morgens schlecht. Ein einfacher visueller Ablaufplan an der Wand — aufwachen, anziehen, frühstücken, Zähne putzen, Schuhe, raus — gibt ihnen etwas zum Folgen, ohne dass Sie jeden Schritt kommentieren müssen.

**Ein Job pro Person**

Jeder in der Familie hat eine Morgenaufgabe, die eindeutig die seine ist. Ein Kind leert die Spülmaschine, das andere macht sein Bett. Kein Warten aufeinander — alle tragen gleichzeitig bei.

**Keine Bildschirme bis alle fertig sind**

Kein Handy, kein Tablet, kein Fernseher, bis jeder angezogen, gegessen und bereit ist. Bildschirmzeit ist das Ziel, nicht die Wartephase. Wenn diese Regel konsequent gilt, hören Kinder auf zu fragen.

**Playlist oder Timer als Anker**

Statt Sie als Uhr zu nutzen, lassen Sie ein Tool das übernehmen. Eine Playlist, die immer gleich lang ist, oder ein Küchentimer externalisiert den Zeitdruck. Wenn die Playlist endet, verlassen Sie das Haus. Kein Streit, nur die Musik.`,
    },

    {
      slug: 'familien-kommandozentrale',
      title: 'Familien-Kommandozentrale einrichten',
      tag: 'Organisation',
      excerpt: 'Eine Familien-Kommandozentrale ist der eine Ort in Ihrem Zuhause, an dem alles Wichtige zusammenkommt. So bauen Sie eine auf, die wirklich genutzt wird.',
      body: `Eine Familien-Kommandozentrale klingt groß. Sie ist es nicht wirklich — es ist einfach der designierte Ort, an dem das organisatorische Leben Ihrer Familie stattfindet. Ein Ort, an dem man hinschaut, um zu wissen, was passiert, was zu tun ist und was kommt.

**Was hineingehört**

Die Kernelemente: ein **gemeinsamer Kalender** (die Ereignisse der Woche für alle sichtbar), ein **Aufgabenbrett** (Dinge, die erledigt werden müssen), ein **Wochenmenü** (was gibt es zu essen?) und ein **Posteingang** für Physisches — Schulbriefe, Einverständniserklärungen, Dinge, die Handlung erfordern.

Sie brauchen das alles nicht von Anfang an. Beginnen Sie mit einem Element und fügen Sie nach und nach mehr hinzu.

**Wo sie hinstellen**

Die Küche ist meistens die beste Wahl. Es ist der Raum, den jeder mehrmals täglich durchquert. Ein Flur funktioniert, wenn er die Hauptverkehrsader ist. Entscheidend: Sie muss dort stehen, wo man natürlich hinschaut.

**Physisch oder digital?**

Beide funktionieren. Eine physische Kommandozentrale — ein großes magnetisches Whiteboard — hat den Vorteil, immer sichtbar zu sein. Eine digitale (eine App wie Eazy.Family) ist überall zugänglich: im Supermarkt, bei der Arbeit, am Sonntagabend beim Planen.

Die beste Lösung für viele Familien ist beides: ein physisches Board für die aktuelle Woche und ein digitaler Hub für alles, was remote zugänglich sein oder in Echtzeit aktualisiert werden muss.

**Die Regel, die es zum Laufen bringt**

Eine Kommandozentrale funktioniert nur, wenn Informationen zuerst dort hingehen und alle Familienmitglieder das wissen. Setzen Sie die Regel früh: Jeder Termin, jede Deadline kommt zuerst auf das Board. Es dauert zwei Wochen, bis es zur Gewohnheit wird — danach läuft es von selbst.`,
    },

    {
      slug: 'bildschirmzeit-regeln',
      title: 'Bildschirmzeit-Regeln, die alle akzeptieren',
      tag: 'Wohlbefinden',
      excerpt: 'Kämpfe um Bildschirmzeit sind erschöpfend. Diese Regeln funktionieren, weil sie konsequent, fair und erklärt sind — nicht nur auferlegt.',
      body: `Bildschirmzeit ist eines der meistdiskutierten Themen im Familienleben. Die meisten Regeln scheitern nicht, weil Eltern zu nachgiebig sind — sondern weil die Regeln inkonsistent, unerkllärt oder für Kinder willkürlich wirken. Die Regeln, die halten, sind die, die alle verstehen und die Eltern selbst befolgen.

**Keine Bildschirme vor der Schule**

Einfach, nicht verhandelbar, gilt für alle. Der Morgen ist zum Fertigmachen da, nicht für YouTube. Wenn es keine Ausnahme gibt — auch nicht am Wochenende, auch nicht für fünf Minuten — hören Kinder auf zu fragen.

**Bildschirme nur nach den Hausaufgaben**

Nicht verhandelbar, nicht "fast fertig", nicht "kurz nachschauen". Fertig bedeutet fertig. Diese Regel motiviert zur Hausaufgabenerledigung auf eine Weise, die Vorlesungen nie können. Verbinden Sie die Belohnung mit dem gewünschten Verhalten.

**Bildschirme eine Stunde vor dem Schlafen weglegen**

Blaues Licht beeinflusst die Schlafqualität, und Schlaf beeinflusst buchstäblich alles andere. Erklären Sie Kindern: "Wir legen die Geräte weg, damit sich dein Gehirn entspannen kann." Eine gleichmäßige Abendroutine — Lesen, Gespräch, ruhige Aktivität — verbessert den Schlaf bei den meisten Kindern innerhalb einer Woche.

**Selbst vorleben**

Kinder beobachten alles. Wenn Sie beim Abendessen am Handy sind, existiert die Regel für Handys beim Abendessen nicht wirklich — sie gilt nur für sie. Wenn Sie möchten, dass Ihre Kinder Geräte weglegen, müssen Sie es selbst zuerst tun.

**Apps nutzen, nicht Willenskraft**

Elternkontroll-Tools — in iOS, Android und den meisten Routern integriert — nehmen Ihnen die Durchsetzung ab und übertragen sie auf die Technologie. Sie sind nicht der Böse; der Timer ist es. Nutzen Sie diese Tools und passen Sie sie an, wenn Kinder älter werden und mehr Autonomie verdienen.`,
    },

    {
      slug: 'kinder-zeitmanagement',
      title: 'Kindern Zeitmanagement beibringen (nach Alter)',
      tag: 'Entwicklung',
      excerpt: 'Das Ziel sind keine gehorsamen Kinder — sondern selbstständige. So übergeben Sie das Zeitmanagement schrittweise, nach Alter, damit es wirklich klappt.',
      body: `Eines der nützlichsten Dinge, die Sie Ihrem Kind geben können, ist die Fähigkeit, die eigene Zeit zu managen. Nicht nur für Ihre Nerven — obwohl das ein echter Vorteil ist — sondern weil Selbstmanagement eine grundlegende Lebenskompetenz ist.

Der häufigste Fehler: Eltern erwarten plötzlich mit 12 oder 13 Jahren "Verantwortlichkeit", obwohl das Fundament Jahre früher gelegt sein sollte. So geht es schrittweise.

**Alter 5–7: Visuelle Pläne und einfache Listen**

In diesem Alter brauchen Kinder externe Struktur, die sie sehen können. Ein visueller Ablaufplan — Bilder mehr als Worte — ist unglaublich wirksam. Morgens: aufwachen, anziehen, frühstücken, Zähne, Schule. Abends: Hausaufgaben, Abendessen, Bad, Geschichte, schlafen. Sie können jeden Schritt selbst abhaken — das gibt ihnen Handlungsfähigkeit und Befriedigung.

**Alter 8–10: Eigener digitaler Kalender und Hausaufgabenplaner**

In diesem Alter können Kinder einen digitalen Kalender verwenden — besonders wenn sie ihn auf einem Gerät sehen können, das sie schon nutzen. Fügen Sie ihre Aktivitäten und Hausaufgaben ein und zeigen Sie ihnen, wie sie selbst etwas eintragen können. Ein Hausaufgabenplaner wird ihr Werkzeug, nicht Ihres. Ihre Aufgabe ist die Kontrolle, nicht das Managen.

Wichtige Verschiebung: Hören Sie auf, sie an Dinge zu erinnern, die sie aufgeschrieben haben. Lassen Sie die natürliche Konsequenz des Vergessens eintreten (im Rahmen). Die Lektion ist stärker als jede Erinnerung.

**Alter 11 und älter: Vollständiger Kalenderzugang und eigenes Erinnerungssystem**

Ab 11 oder 12 können die meisten Kinder ihren vollen Zeitplan managen, wenn sie die Werkzeuge und die Erwartung bekommen. Ein gemeinsamer Familienkalender, in dem sie ihre Verpflichtungen neben denen der Familie sehen können. Eigene Erinnerungen, die sie selbst setzen.

Ihre Rolle wird zum Mentor, nicht zum Manager. Das Ergebnis: ein Teenager, der weiß, wo er sein muss und was er mitnehmen muss — und der fragt, wenn er Hilfe braucht.`,
    },
  ],

  fr: [
    {
      slug: 'routine-matinale-famille',
      title: 'La routine matinale qui fonctionne vraiment',
      tag: 'Routine',
      excerpt: 'Les matins n\'ont pas à être chaotiques. Quelques ajustements structurels — pas de volonté surhumaine — suffisent pour que ça marche.',
      body: `Les matins, c'est là que la vie de famille coule ou s'effondre. La bonne nouvelle, c'est que ce n'est presque jamais un problème de personnes — c'est un problème de système. Et les systèmes peuvent être améliorés.

**Prévoir un buffer de 15 minutes**

Quelle que soit l'heure à laquelle vous pensez devoir partir, ajoutez 15 minutes. Pas parce que vous les utiliserez toutes, mais parce que les jours où vous en avez besoin — la chaussure introuvable, la lettre non signée — vous serez tellement soulagé.

**Préparer la veille au soir, toujours**

Le plus grand levier que vous puissiez actionner, c'est la veille au soir. Sacs préparés. Vêtements choisis et posés. Boîtes à lunch faites. Tout ce qui peut être décidé à 20h ne doit pas être décidé à 7h. Faites-en une règle.

**Donner aux enfants un emploi du temps visuel**

Les jeunes enfants, surtout avant 8 ans, ne traitent pas bien les séquences verbales à vitesse. Un emploi du temps visuel simple — se lever, s'habiller, petit-déjeuner, dents, chaussures, sortir — leur donne quelque chose à suivre sans que vous ayez à narrer chaque étape.

**Un rôle par personne**

Chacun dans la famille a un rôle matinal qui lui appartient clairement. Un enfant vide le lave-vaisselle, l'autre fait son lit. Personne n'attend personne — tout le monde contribue simultanément.

**Pas d'écrans avant que tout le monde soit prêt**

Pas de téléphone, pas de tablette, pas de TV tant que chaque personne n'est pas habillée, nourrie et prête. Le temps d'écran est la ligne d'arrivée, pas la salle d'attente.

**Ancrer la routine à une playlist ou un minuteur**

Plutôt que d'être vous-même l'horloge, laissez un outil le faire. Une playlist de durée fixe, ou un minuteur visuel sur le comptoir de la cuisine, externalise la pression du temps. Quand la playlist se termine, on part.`,
    },

    {
      slug: 'centre-commandement-familial',
      title: 'Créer un centre de commandement familial',
      tag: 'Organisation',
      excerpt: 'Un centre de commandement familial, c\'est l\'endroit unique dans votre maison où tout ce qui est important se trouve. Voici comment en créer un qui sera vraiment utilisé.',
      body: `Un centre de commandement familial semble ambitieux. Ce n'est pas vraiment le cas — c'est simplement l'endroit désigné où la vie organisationnelle de votre famille a lieu. Un endroit où aller pour savoir ce qui se passe, ce qui doit être fait et ce qui arrive.

**Ce qui y figure**

Les éléments essentiels : un **calendrier partagé** (les événements de la semaine visibles par tous), un **tableau des tâches** (ce qui doit être fait à la maison ou pour l'école), un **menu de la semaine** et une **boîte de réception** pour le courrier physique — lettres d'école, autorisations, choses nécessitant une action.

Vous n'avez pas besoin de tout dès le départ. Commencez par un élément et ajoutez le reste progressivement.

**Où le placer**

La cuisine est généralement le meilleur endroit. C'est la pièce par laquelle tout le monde passe plusieurs fois par jour. L'essentiel : ce doit être là où vous regardez naturellement.

**Physique ou numérique ?**

Les deux fonctionnent. Un centre physique — un grand tableau blanc magnétique — est toujours visible. Un centre numérique (une application comme Eazy.Family) est accessible partout : au supermarché, au travail, le dimanche soir en planifiant la semaine.

La meilleure configuration pour beaucoup de familles : les deux. Un tableau physique pour la semaine en cours, et un hub numérique pour tout ce qui doit être accessible à distance.

**La règle qui fait que ça marche**

Un centre de commandement ne fonctionne que si les informations y vont en premier et que tous les membres de la famille le savent. Posez la règle tôt : tout rendez-vous, toute échéance va d'abord là. Il faut deux semaines pour en faire une habitude — ensuite, ça se gère tout seul.`,
    },

    {
      slug: 'regles-temps-ecran',
      title: 'Les règles temps d\'écran que toute la famille accepte',
      tag: 'Bien-être',
      excerpt: 'Les batailles autour des écrans sont épuisantes. Ces règles tiennent parce qu\'elles sont cohérentes, justes et expliquées — pas juste imposées.',
      body: `Le temps d'écran est l'un des sujets les plus débattus dans la vie de famille. La plupart des règles échouent non pas parce que les parents sont trop indulgents — mais parce que les règles sont incohérentes, non expliquées ou semblent arbitraires aux enfants. Les règles qui tiennent sont celles que tout le monde comprend, et que les parents respectent aussi.

**Pas d'écrans avant l'école**

Simple, non négociable, s'applique à tout le monde. Le matin est fait pour se préparer, pas pour YouTube. Quand il n'y a pas d'exception — même le week-end, même pour cinq minutes — les enfants arrêtent de demander.

**Écrans seulement après les devoirs terminés**

Pas "presque finis", pas "juste vérifier quelque chose". Terminé signifie terminé. Cette règle motive aussi la réalisation des devoirs d'une façon que les sermons ne font jamais.

**Écrans éteints une heure avant le coucher**

La lumière bleue affecte la qualité du sommeil. Expliquez-le aux enfants : "On range les écrans pour que ton cerveau puisse se détendre." Une routine de coucher cohérente améliore le sommeil de la plupart des enfants en une semaine.

**Modéliser le comportement vous-même**

Les enfants observent tout. Si vous êtes sur votre téléphone pendant le dîner, la règle "pas de téléphone au dîner" n'existe pas vraiment — elle ne s'applique qu'à eux. Si vous voulez que vos enfants rangent les écrans, vous devez le faire en premier.

**Utiliser des applications, pas la volonté**

Les outils de contrôle parental — intégrés dans iOS, Android et la plupart des routeurs — transfèrent l'application à la technologie. Ce n'est pas vous le méchant ; c'est le minuteur. Utilisez-les. Ajustez-les au fur et à mesure que vos enfants grandissent et méritent plus d'autonomie.`,
    },

    {
      slug: 'apprendre-enfants-gerer-temps',
      title: 'Apprendre aux enfants à gérer leur temps (par âge)',
      tag: 'Développement',
      excerpt: 'L\'objectif n\'est pas des enfants obéissants — c\'est des enfants indépendants. Voici comment transférer progressivement la gestion du temps, par âge.',
      body: `L'une des choses les plus utiles que vous puissiez donner à votre enfant, c'est la capacité à gérer son propre temps. Pas seulement pour votre santé mentale — bien que ce soit un vrai avantage — mais parce que l'auto-gestion est une compétence de vie fondamentale.

L'erreur des parents : attendre que les enfants "soient responsables" autour de 12 ou 13 ans, alors que les bases auraient dû être posées bien plus tôt. Voici comment le faire progressivement.

**Âges 5–7 : Emplois du temps visuels et listes simples**

À cet âge, les enfants ont besoin d'une structure externe qu'ils peuvent voir. Un emploi du temps visuel — des images plus que des mots — montrant la séquence de leur journée est très efficace. Ils peuvent cocher chaque étape eux-mêmes, ce qui leur donne de l'autonomie et de la satisfaction.

Une liste de tâches simple avec des images — poser sa boîte à lunch dans l'évier, ranger ses chaussures, mettre son sac d'école près de la porte — limite à 3–4 éléments maximum.

**Âges 8–10 : Leur propre agenda numérique et planificateur de devoirs**

À cet âge, les enfants peuvent gérer un agenda numérique. Ajoutez leurs activités et délais de devoirs. Montrez-leur comment ajouter eux-mêmes des éléments. Un planificateur de devoirs (physique ou numérique) devient leur outil, pas le vôtre.

Changement clé : arrêtez de leur rappeler les choses qu'ils ont notées. Laissez la conséquence naturelle de l'oubli se produire (dans des limites raisonnables).

**Âges 11 et plus : Accès complet au calendrier et leur propre système de rappels**

À partir de 11 ou 12 ans, la plupart des enfants peuvent gérer leur emploi du temps complet si on leur donne les outils et l'attente. Un calendrier familial partagé. Leurs propres rappels qu'ils définissent eux-mêmes.

Votre rôle devient mentor, pas manager. Le résultat : un adolescent qui sait où il doit être et ce qu'il doit apporter.`,
    },
  ],

  it: [
    {
      slug: 'routine-mattutina-famiglia',
      title: 'La routine mattutina che funziona davvero',
      tag: 'Routine',
      excerpt: 'Le mattine non devono essere caos. Qualche piccolo aggiustamento strutturale — non una forza di volontà sovrumana — è tutto ciò che serve.',
      body: `Le mattine sono dove la vita familiare scorre o si inceppa. La buona notizia: quasi mai è un problema di persone — è un problema di sistema. E i sistemi si possono migliorare.

**Costruire un buffer di 15 minuti**

Qualunque sia l'orario in cui pensi di dover uscire, aggiungi 15 minuti. Non perché li userai tutti, ma perché i giorni in cui ne hai bisogno — la scarpa introvabile, il modulo non firmato — sarai così contento di averli.

**Preparare la sera prima, sempre**

La leva più grande che puoi usare è la sera prima. Borse pronte. Vestiti scelti e stesi. Pranzi fatti. Tutto ciò che può essere deciso alle 20:00 non deve essere deciso alle 7:00. Rendilo una regola e mantienila.

**Un piano visivo per i bambini**

I bambini piccoli, specialmente sotto gli 8 anni, non elaborano bene le sequenze verbali di fretta. Un semplice piano visivo sul muro — sveglia, vestiti, colazione, denti, scarpe, uscire — dà loro qualcosa da seguire senza che tu debba narrare ogni passo.

**Un compito per persona**

Ognuno in famiglia ha un compito mattutino che è chiaramente suo. Un bambino svuota la lavastoviglie mentre l'altro rifà il letto. Nessuno aspetta nessun altro — tutti contribuiscono simultaneamente.

**Nessuno schermo finché tutti non sono pronti**

Nessun telefono, nessun tablet, nessuna TV finché ogni persona non è vestita, nutriita e pronta. Il tempo schermo è il traguardo, non la sala d'attesa.

**Ancorare la routine a una playlist o a un timer**

Invece di essere tu l'orologio, lascia che lo faccia uno strumento. Una playlist di durata fissa, o un timer visivo sul bancone della cucina, esternalizza la pressione del tempo. Quando la playlist finisce, si esce.`,
    },

    {
      slug: 'centro-comando-familiare',
      title: 'Come creare un centro di comando familiare',
      tag: 'Organizzazione',
      excerpt: 'Un centro di comando familiare è l\'unico posto in casa dove vive tutto ciò che è importante. Ecco come costruirne uno che venga davvero usato.',
      body: `Un centro di comando familiare sembra grandioso. In realtà non lo è — è semplicemente il posto designato dove avviene la vita organizzativa della tua famiglia. Un posto dove andare per sapere cosa sta succedendo, cosa deve essere fatto e cosa arriverà.

**Cosa ci va dentro**

Gli elementi fondamentali: un **calendario condiviso** (gli eventi della settimana visibili a tutti), una **bacheca delle attività** (cose da fare in casa o per la scuola), un **menu settimanale** e una **casella di posta** per la posta fisica — lettere scolastiche, autorizzazioni, cose che richiedono azione.

Non hai bisogno di tutto fin dall'inizio. Inizia con un elemento e aggiungi il resto nel tempo.

**Dove metterlo**

La cucina è di solito la scelta migliore. È la stanza che tutti attraversano più volte al giorno. L'essenziale: deve essere da qualche parte dove guardi naturalmente.

**Fisico o digitale?**

Entrambi funzionano. Un centro fisico — una grande lavagna bianca magnetica — ha il vantaggio di essere sempre visibile. Un centro digitale (un'app come Eazy.Family) è accessibile ovunque: al supermercato, al lavoro, la domenica sera mentre pianifichi la settimana.

La migliore configurazione per molte famiglie è entrambe: una bacheca fisica per la settimana corrente e un hub digitale per tutto ciò che deve essere accessibile da remoto.

**La regola che fa funzionare tutto**

Un centro di comando funziona solo se le informazioni vi vanno per prime e tutti i membri della famiglia lo sanno. Stabilisci la regola presto: qualsiasi appuntamento, qualsiasi scadenza va prima sulla bacheca. Ci vogliono due settimane per diventare un'abitudine — dopo si gestisce da solo.`,
    },

    {
      slug: 'regole-tempo-schermo',
      title: 'Regole sul tempo schermo che funzionano per tutti',
      tag: 'Benessere',
      excerpt: 'Le battaglie sul tempo schermo sono estenuanti. Queste regole reggono perché sono coerenti, giuste e spiegate — non solo imposte.',
      body: `Il tempo schermo è uno degli argomenti più discussi nella vita familiare. La maggior parte delle regole fallisce non perché i genitori siano troppo indulgenti — ma perché le regole sono incoerenti, non spiegate o sembrano arbitrarie ai bambini. Le regole che reggono sono quelle che tutti capiscono e che i genitori stessi seguono.

**Nessuno schermo prima della scuola**

Semplice, non negoziabile, vale per tutti. La mattina è per prepararsi, non per YouTube. Quando non c'è eccezione — nemmeno il weekend, nemmeno per cinque minuti — i bambini smettono di chiedere.

**Schermi solo dopo i compiti finiti**

Non "quasi finiti", non "guardo solo una cosa". Finito significa finito. Questa regola motiva anche il completamento dei compiti in un modo che le prediche non fanno mai.

**Schermi spenti un'ora prima di dormire**

La luce blu influenza la qualità del sonno. Spiega ai bambini: "Mettiamo via gli schermi perché il tuo cervello possa rilassarsi." Una routine serale coerente — lettura, conversazione, un'attività tranquilla — migliora il sonno della maggior parte dei bambini nell'arco di una settimana.

**Modellare il comportamento tu stesso**

I bambini osservano tutto. Se sei sul telefono durante la cena, la regola dei telefoni a cena non esiste davvero — si applica solo a loro. Se vuoi che i tuoi figli mettano via gli schermi, devi farlo tu per primo.

**Usare app, non forza di volontà**

Gli strumenti di controllo genitoriale — integrati in iOS, Android e nella maggior parte dei router — trasferiscono l'applicazione alla tecnologia. Non sei tu il cattivo; è il timer. Usali e adattali man mano che i bambini crescono e meritano più autonomia.`,
    },

    {
      slug: 'insegnare-bambini-gestire-tempo',
      title: 'Insegnare ai bambini a gestire il tempo (per età)',
      tag: 'Sviluppo',
      excerpt: 'L\'obiettivo non sono bambini obbedienti — sono bambini indipendenti. Ecco come trasferire progressivamente la gestione del tempo, per età.',
      body: `Una delle cose più utili che puoi dare a tuo figlio è la capacità di gestire il proprio tempo. Non solo per la tua sanità mentale — anche se è un vero vantaggio — ma perché l'autogestione è una competenza di vita fondamentale.

L'errore comune: aspettarsi che i bambini "siano responsabili" intorno ai 12 o 13 anni, quando le basi avrebbero dovuto essere poste anni prima. Ecco come farlo progressivamente.

**Età 5–7: Piani visivi e liste semplici**

A questa età i bambini hanno bisogno di una struttura esterna che possano vedere. Un piano visivo — immagini più che parole — che mostra la sequenza della loro giornata è incredibilmente efficace. Possono spuntare ogni passo da soli, il che dà loro autonomia e soddisfazione.

**Età 8–10: Il loro proprio calendario digitale e agenda dei compiti**

A questa età i bambini possono gestire un calendario digitale. Aggiungici le loro attività e le scadenze dei compiti. Mostra loro come aggiungere elementi da soli. Un'agenda dei compiti diventa il loro strumento, non il tuo.

Cambiamento chiave: smettila di ricordare loro le cose che hanno scritto. Lascia che avvenga la conseguenza naturale del dimenticare (entro limiti ragionevoli).

**Età 11 e oltre: Accesso completo al calendario e sistema di promemoria proprio**

Dagli 11 o 12 anni la maggior parte dei bambini può gestire il proprio programma completo se gli vengono dati gli strumenti e le aspettative giuste. Un calendario familiare condiviso. I propri promemoria impostati da loro stessi.

Il tuo ruolo diventa mentore, non manager. Il risultato: un adolescente che sa dove deve essere e cosa deve portare — e che chiede aiuto quando ne ha bisogno.`,
    },
  ],
};

// ─────────────────────────────────────────────
// SHOP CATEGORIES & PRODUCTS
// ─────────────────────────────────────────────

export const SHOP_CATEGORIES: { category: string; emoji: string; items: ShopProduct[] }[] = [
  {
    category: 'Family Planners',
    emoji: '📅',
    items: [
      {
        id: 'fp1',
        name: 'Large Family Wall Calendar 2026',
        tagline: 'Colour-coded columns for up to 6 family members — at a glance, every week.',
        category: 'Family Planners',
        searchQuery: 'large+family+wall+calendar+2026+color+coded+columns',
        badge: 'Top Pick',
      },
      {
        id: 'fp2',
        name: 'Magnetic Dry-Erase Command Centre',
        tagline: 'Weekly planner, notes, grocery list, and meal plan — all on your kitchen wall.',
        category: 'Family Planners',
        searchQuery: 'magnetic+dry+erase+family+command+center+board+weekly+planner',
        badge: "Editor's Choice",
      },
      {
        id: 'fp3',
        name: 'Weekly Family Planner Notepad',
        tagline: 'Tear-off weekly pages with meal planning, priorities, and shopping sections.',
        category: 'Family Planners',
        searchQuery: 'family+weekly+planner+notepad+meal+planning+shopping',
        badge: 'Family Favourite',
      },
    ],
  },
  {
    category: 'Smart Home',
    emoji: '🏠',
    items: [
      {
        id: 'sh1',
        name: 'Amazon Echo Show 8',
        tagline: 'The kitchen display that shows your family calendar, reminders, and recipes hands-free.',
        category: 'Smart Home',
        searchQuery: 'amazon+echo+show+8+smart+display+kitchen+calendar',
        badge: 'Top Pick',
      },
      {
        id: 'sh2',
        name: 'Tile Mate Bluetooth Tracker 4-Pack',
        tagline: 'Never lose keys, school bags, or wallets again — find everything from your phone.',
        category: 'Smart Home',
        searchQuery: 'tile+mate+bluetooth+tracker+4+pack+key+finder',
        badge: 'Family Favourite',
      },
      {
        id: 'sh3',
        name: 'Kindle Kids Edition',
        tagline: 'Unlimited books, built-in parental controls, and a 2-year worry-free guarantee.',
        category: 'Smart Home',
        searchQuery: 'kindle+kids+edition+e-reader+parental+controls+unlimited+books',
        badge: "Editor's Choice",
      },
    ],
  },
  {
    category: 'Kids Activities',
    emoji: '🎨',
    items: [
      {
        id: 'ka1',
        name: 'National Geographic Kids Science Kit',
        tagline: '20+ STEM experiments with a real junior scientist certificate included.',
        category: 'Kids Activities',
        searchQuery: 'national+geographic+kids+science+kit+stem+experiments+junior',
        badge: 'Top Pick',
      },
      {
        id: 'ka2',
        name: 'Melissa & Doug Double-Sided Easel',
        tagline: 'Whiteboard on one side, chalkboard on the other — endless creative hours guaranteed.',
        category: 'Kids Activities',
        searchQuery: 'melissa+doug+double+sided+art+easel+whiteboard+chalkboard+kids',
        badge: 'Family Favourite',
      },
      {
        id: 'ka3',
        name: 'LEGO Classic Large Creative Brick Box',
        tagline: 'Open-ended building for ages 4+ — the toy that never gets boring.',
        category: 'Kids Activities',
        searchQuery: 'lego+classic+large+creative+brick+box+open+ended+building',
        badge: "Editor's Choice",
      },
    ],
  },
  {
    category: 'Family Game Night',
    emoji: '🎲',
    items: [
      {
        id: 'gn1',
        name: 'Ticket to Ride',
        tagline: 'The strategy board game that gets every generation around the table for hours.',
        category: 'Family Game Night',
        searchQuery: 'ticket+to+ride+board+game+family+strategy+days+of+wonder',
        badge: 'Top Pick',
      },
      {
        id: 'gn2',
        name: 'Spot It! (Dobble)',
        tagline: 'The impossibly fast card game that works for ages 4 to 94.',
        category: 'Family Game Night',
        searchQuery: 'spot+it+dobble+card+game+family+all+ages',
        badge: 'Family Favourite',
      },
      {
        id: 'gn3',
        name: 'Azul',
        tagline: 'Award-winning abstract strategy game that\'s beautiful, quick, and completely addictive.',
        category: 'Family Game Night',
        searchQuery: 'azul+board+game+strategy+next+move+games+award+winning',
        badge: "Editor's Choice",
      },
    ],
  },
  {
    category: 'Back to School',
    emoji: '🎒',
    items: [
      {
        id: 'bs1',
        name: 'Bentgo Kids Lunchbox',
        tagline: 'Leak-proof, 5-compartment, BPA-free — the lunchbox that actually stays closed.',
        category: 'Back to School',
        searchQuery: 'bentgo+kids+lunchbox+5+compartment+leak+proof+bpa+free',
        badge: 'Top Pick',
      },
      {
        id: 'bs2',
        name: 'Crayola Ultimate Art Supply Set',
        tagline: 'Everything for art homework, creative projects, and rainy day activities.',
        category: 'Back to School',
        searchQuery: 'crayola+ultimate+art+supply+set+kids+school+creative',
        badge: "Editor's Choice",
      },
      {
        id: 'bs3',
        name: 'Homework Station Desk Organizer',
        tagline: 'Keeps pencils, scissors, rulers, and papers in order so study time starts faster.',
        category: 'Back to School',
        searchQuery: 'kids+homework+station+desk+organizer+school+supplies+storage',
        badge: 'Family Favourite',
      },
    ],
  },
];

// ─────────────────────────────────────────────
// HELPERS & CONSTANTS
// ─────────────────────────────────────────────

export const AFFILIATE_TAG = 'eazyfamily-21';

export function amazonUrl(searchQuery: string): string {
  return `https://www.amazon.com/s?k=${searchQuery}&tag=${AFFILIATE_TAG}`;
}

export const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
};

export const SECTION_LABELS = {
  blog:      { en: 'Blog',      de: 'Blog',    fr: 'Blog',    it: 'Blog' },
  parenting: { en: 'Parenting', de: 'Eltern',  fr: 'Parents', it: 'Genitori' },
  shop:      { en: 'EZ Shop',   de: 'EZ Shop', fr: 'EZ Shop', it: 'EZ Shop' },
} as const;
