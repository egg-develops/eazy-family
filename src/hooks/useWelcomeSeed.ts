import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SEED_FLAG = 'eazy-seeded-v3';

// ── Seed content ──────────────────────────────────────────────────────────────
// Designed using behavioral psychology principles:
//   Zeigarnik Effect    — incomplete tasks stay top of mind
//   Endowment Effect    — pre-loaded content feels like "theirs"
//   Curiosity Gap       — vague personal-sounding items invite projection
//   Loss Aversion       — "don't forget" framing triggers mild urgency
//   Social Norm         — universally relatable tasks reduce new-user anxiety
//   Completion Pull     — a mix of easy and meaningful items drives first action
// ─────────────────────────────────────────────────────────────────────────────

interface SeedContent {
  personalTodos: string[];
  personalShopping: string[];
  sharedShopping: string[];
  sharedListName: string;
  sharedTodos: string[];
}

const SEED: Record<string, SeedContent> = {
  de: {
    personalTodos: [
      '🦷 Zahnarzt anrufen — wird langsam Zeit',
      '📝 Diese Idee, die du schon lange aufschreiben wolltest',
      '🎁 Etwas Schönes für das Wochenende planen',
      '📦 Das, was du immer wieder auf nächste Woche verschiebst',
    ],
    personalShopping: [
      'Milch 🥛',
      'Eier',
      'Brot',
      'Kaffee ☕',
      'Spülmittel 🧴',
    ],
    sharedShopping: [
      'Obst für die Woche 🍎',
      'Etwas fürs Wochenendessen',
      'Haushaltsbedarf',
      'Snacks für die Kinder',
    ],
    sharedListName: 'Familien-Aufgaben 🏡',
    sharedTodos: [
      '📅 Diese Woche gemeinsam planen',
      '🧹 Entscheiden, wer was am Wochenende übernimmt',
      '✨ Auf etwas freuen, das alle erwarten',
    ],
  },
  fr: {
    personalTodos: [
      '🦷 Appeler le dentiste — tu remets depuis un moment',
      '📝 Cette idée que tu voulais noter depuis longtemps',
      '🎁 Prévoir quelque chose de sympa ce week-end',
      '📦 Ce truc que tu reportes à la semaine prochaine',
    ],
    personalShopping: [
      'Lait 🥛',
      'Œufs',
      'Pain',
      'Café ☕',
      'Liquide vaisselle 🧴',
    ],
    sharedShopping: [
      'Fruits pour la semaine 🍎',
      'Quelque chose pour le dîner du week-end',
      'Produits ménagers',
      'Collations pour les enfants',
    ],
    sharedListName: 'Tâches familiales 🏡',
    sharedTodos: [
      '📅 Planifier la semaine ensemble',
      '🧹 Décider qui fait quoi ce week-end',
      '✨ Quelque chose que tout le monde attend avec impatience',
    ],
  },
  it: {
    personalTodos: [
      '🦷 Chiamare il dentista — lo rimandi da un po\'',
      '📝 Quell\'idea che vuoi annotare da tanto',
      '🎁 Organizzare qualcosa di bello per il weekend',
      '📦 Quella cosa che sposti sempre alla settimana prossima',
    ],
    personalShopping: [
      'Latte 🥛',
      'Uova',
      'Pane',
      'Caffè ☕',
      'Detersivo per i piatti 🧴',
    ],
    sharedShopping: [
      'Frutta per la settimana 🍎',
      'Qualcosa per la cena del weekend',
      'Prodotti per la casa',
      'Snack per i bambini',
    ],
    sharedListName: 'Impegni di famiglia 🏡',
    sharedTodos: [
      '📅 Pianificare la settimana insieme',
      '🧹 Decidere chi fa cosa questo weekend',
      '✨ Qualcosa che aspettate tutti con piacere',
    ],
  },
  es: {
    personalTodos: [
      '🦷 Llamar al dentista — llevas tiempo aplazándolo',
      '📝 Esa idea que querías anotar hace tiempo',
      '🎁 Planear algo bonito para este fin de semana',
      '📦 Eso que sigues moviendo para la semana que viene',
    ],
    personalShopping: [
      'Leche 🥛',
      'Huevos',
      'Pan',
      'Café ☕',
      'Lavavajillas 🧴',
    ],
    sharedShopping: [
      'Fruta para la semana 🍎',
      'Algo para la cena del fin de semana',
      'Productos del hogar',
      'Meriendas para los niños',
    ],
    sharedListName: 'Tareas familiares 🏡',
    sharedTodos: [
      '📅 Planear la semana juntos',
      '🧹 Decidir quién hace qué este fin de semana',
      '✨ Algo que todos esperamos con ilusión',
    ],
  },
  pt: {
    personalTodos: [
      '🦷 Ligar para o dentista — você tem adiado',
      '📝 Aquela ideia que você queria anotar faz tempo',
      '🎁 Planejar algo especial para o fim de semana',
      '📦 Aquilo que você continua adiando para a próxima semana',
    ],
    personalShopping: [
      'Leite 🥛',
      'Ovos',
      'Pão',
      'Café ☕',
      'Detergente da louça 🧴',
    ],
    sharedShopping: [
      'Frutas para a semana 🍎',
      'Algo para o jantar do fim de semana',
      'Itens básicos do lar',
      'Lanches para as crianças',
    ],
    sharedListName: 'Tarefas da família 🏡',
    sharedTodos: [
      '📅 Planejar a semana juntos',
      '🧹 Decidir quem faz o quê no fim de semana',
      '✨ Algo que todos aguardam com expectativa',
    ],
  },
  en: {
    personalTodos: [
      '🦷 Call the dentist — you\'ve been putting it off',
      '📝 That idea you keep meaning to write down',
      '🎁 Plan something nice for this weekend',
      '📦 That thing you keep moving to next week',
    ],
    personalShopping: [
      'Milk 🥛',
      'Eggs',
      'Bread',
      'Coffee ☕',
      'Washing up liquid 🧴',
    ],
    sharedShopping: [
      'Fruit for the week 🍎',
      'Something for the weekend dinner',
      'Household basics',
      'Snacks for the kids',
    ],
    sharedListName: 'Family To-Dos 🏡',
    sharedTodos: [
      '📅 Plan this week together',
      '🧹 Decide who does what this weekend',
      '✨ Something everyone is looking forward to',
    ],
  },
};

const getFallbackLang = (lang: string): string => {
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('it')) return 'it';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('pt')) return 'pt';
  return 'en';
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useWelcomeSeed(
  userId: string | undefined,
  familyId: string | null | undefined,
  language: string
) {
  useEffect(() => {
    if (!userId) return;
    if (localStorage.getItem(SEED_FLAG)) return;

    const run = async () => {
      try {
        // Only seed truly empty accounts
        const { count } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (count && count > 0) {
          localStorage.setItem(SEED_FLAG, '1');
          return;
        }

        const langKey = getFallbackLang(language);
        const content = SEED[langKey] ?? SEED.en;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 1 — Personal to-dos
        await supabase.from('tasks').insert(
          content.personalTodos.map((title, i) => ({
            title,
            type: 'task',
            user_id: userId,
            completed: false,
            due_date: i === 0 ? tomorrowStr : null,
          }))
        );

        // 2 — Personal shopping
        await supabase.from('tasks').insert(
          content.personalShopping.map(title => ({
            title,
            type: 'shopping_personal',
            user_id: userId,
            completed: false,
          }))
        );

        // 3 — Shared shopping (accessible to future family members)
        await supabase.from('tasks').insert(
          content.sharedShopping.map(title => ({
            title,
            type: 'shopping',
            user_id: userId,
            completed: false,
          }))
        );

        // 4 — Shared to-do list (only if user is in a family)
        if (familyId) {
          const { data: listRow } = await supabase
            .from('tasks')
            .insert([{
              title: content.sharedListName,
              type: 'shared',
              user_id: userId,
              family_id: familyId,
              completed: false,
            }])
            .select()
            .single();

          if (listRow?.id) {
            await supabase.from('tasks').insert(
              content.sharedTodos.map(title => ({
                title,
                type: 'shared',
                user_id: userId,
                family_id: familyId,
                parent_id: listRow.id,
                completed: false,
              }))
            );
          }
        }

        localStorage.setItem(SEED_FLAG, '1');
      } catch {
        // Silent — seeding is best-effort, never blocks the user
      }
    };

    run();
  }, [userId, familyId, language]);
}
