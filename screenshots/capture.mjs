/**
 * App Store screenshot capture — Eazy.Family
 * Usage:  node screenshots/capture.mjs            (English → raw/ + framed/)
 *         SHOT_LANG=de node screenshots/capture.mjs (German → raw-de/ + framed-de/)
 * Output: bare 1290×2796 PNG + phone-framed App Store-ready PNG, per language.
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const LANG       = process.env.SHOT_LANG || 'en';
const BASE_URL   = 'https://eazy.family';
const EMAIL      = process.env.DEMO_EMAIL    || 'hello@eazy.family';
const PASSWORD   = process.env.DEMO_PASSWORD || 'EZ.Simpsons2026';

const SUPABASE_URL = 'https://jfztyhuagxruhawchfem.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmenR5aHVhZ3hydWhhd2NoZmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTAyODAsImV4cCI6MjA4OTQyNjI4MH0.p7_6UVD8QykX7lzUEbDZs8VqsKBqs7UxYYBHKVnXcC0';

// App Store 6.7" iPhone (iPhone 15 Pro Max) required dimensions
const VP_W = 430;
const VP_H = 932;
const DPR  = 3;
const SCR_W = VP_W * DPR;  // 1290
const SCR_H = VP_H * DPR;  // 2796

// Phone frame canvas
const FR_W  = 1580;
const FR_H  = 3200;
const SCR_X = Math.round((FR_W - SCR_W) / 2);  // 145
const SCR_Y = 200;

// iOS 17 safe-area-inset-top (iPhone 15 Pro Max) in CSS px
const SAFE_TOP = 59;

// Anchor demo dates to the real "today" so the calendar/agenda are always
// populated whenever screenshots are taken (not stuck in a past month).
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const evISO = (day, h, m = 0) => { const d = new Date(TODAY); d.setDate(d.getDate() + day); d.setHours(h, m, 0, 0); return d.toISOString(); };

const SUFFIX     = LANG === 'en' ? '' : `-${LANG}`;
const OUT_RAW    = path.join(__dirname, `raw${SUFFIX}`);
const OUT_FRAMED = path.join(__dirname, `framed${SUFFIX}`);
fs.mkdirSync(OUT_RAW, { recursive: true });
fs.mkdirSync(OUT_FRAMED, { recursive: true });

// ── Demo family name mapping (Simpsons → Millers) — names are language-neutral ──
const FAMILY_RENAME = {
  'Homer':  'Tom',
  'Marge':  'Sarah',
  'Bart':   'Liam',
  'Lisa':   'Zoe',
  'Maggie': 'Emma',
};

// ── Localized demo content ────────────────────────────────────────────────────
const CONTENT = {
  en: {
    tasks: [
      'School pickup — Zoe & Liam', 'Book pediatrician checkup (Liam)', 'Soccer practice gear for Zoe',
      'Pay school fees (due Friday)', 'Car service appointment', 'Grocery order for the weekend',
      'Fix garden gate latch', 'Book summer camp registration', 'Plan anniversary dinner',
    ],
    cal: [
      { id: 'demo-c1', title: 'Dentist — Liam',            location: 'City Dental Clinic', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: "Zoe's dance recital",       location: 'Community Hall',     color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Swimming Lesson',           location: 'Aquatic Center',     color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: "Children's Museum",         location: null,                 color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: "Family dinner @ Grandma's", location: null,                 color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: [
      'Hiking trip 🥾', 'Dentist — Liam', 'School pickup — Liam', "Emma's birthday party 🎂", 'Swim training — Zoe',
      "Zoe's dance recital 💃", 'Family dinner 🍝', 'Parent-Teacher meeting', "Grandma's birthday 🎂", 'Family film night 🎬',
    ],
    journal: [
      'Family trip was great, all the planning was worth it. A few things we could have done without but in the end all good.',
      'Need to get back on my evening routine, it really affects my next day. Compared to the last two weeks when I was feeling amazing.',
    ],
    shopping: ['Bananas', 'Cherry tomatoes', 'Organic whole milk', 'Free-range eggs', 'Cheddar cheese', 'Chicken breast', 'Sourdough bread', 'Coffee beans', 'Orange juice', 'Dish soap', 'Baby wipes', 'Pasta'],
    shared: [
      { title: 'Book family holiday', day: 3 },
      { title: 'Sign school permission slip', day: 1 },
      { title: 'Buy birthday gift for Emma', day: 5 },
    ],
    orb: 'Create a task to plan anniversary dinner and add flowers and cake to our shopping list.',
    dismiss: ['Skip', "Let's go"],
  },
  de: {
    tasks: [
      'Zoe & Liam von der Schule abholen', 'Kinderarzt-Termin buchen (Liam)', 'Fußballausrüstung für Zoe',
      'Schulgebühren zahlen (bis Freitag)', 'Termin Autoservice', 'Lebensmittel fürs Wochenende bestellen',
      'Gartentor reparieren', 'Sommercamp anmelden', 'Jahrestag-Dinner planen',
    ],
    cal: [
      { id: 'demo-c1', title: 'Zahnarzt — Liam',     location: 'Zahnklinik',   color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Zoes Tanzaufführung', location: 'Gemeindesaal', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Schwimmkurs',         location: 'Schwimmbad',   color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Kindermuseum',        location: null,           color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Abendessen bei Oma',  location: null,           color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: [
      'Wanderausflug 🥾', 'Zahnarzt — Liam', 'Liam von der Schule abholen', 'Emmas Geburtstagsparty 🎂', 'Schwimmtraining — Zoe',
      'Zoes Tanzaufführung 💃', 'Familienessen 🍝', 'Elternabend', 'Omas Geburtstag 🎂', 'Familien-Filmabend 🎬',
    ],
    journal: [
      'Der Familienausflug war toll, die ganze Planung hat sich gelohnt. Ein paar Dinge hätten wir weglassen können, aber am Ende alles gut.',
      'Ich muss wieder zu meiner Abendroutine finden — sie beeinflusst meinen nächsten Tag enorm. Verglichen mit den letzten zwei Wochen, als ich mich großartig fühlte.',
    ],
    shopping: ['Bananen', 'Kirschtomaten', 'Bio-Vollmilch', 'Freilandeier', 'Cheddar-Käse', 'Hähnchenbrust', 'Sauerteigbrot', 'Kaffeebohnen', 'Orangensaft', 'Spülmittel', 'Feuchttücher', 'Nudeln'],
    shared: [
      { title: 'Familienurlaub buchen', day: 3 },
      { title: 'Einverständniserklärung Schule unterschreiben', day: 1 },
      { title: 'Geburtstagsgeschenk für Emma kaufen', day: 5 },
    ],
    orb: 'Erstelle eine Aufgabe, um das Jahrestag-Dinner zu planen, und füge Blumen und Kuchen zur Einkaufsliste hinzu.',
    dismiss: ['Überspringen', "Los geht's", 'Weiter', 'Fertig'],
  },
  fr: {
    tasks: [
      "Récupérer Zoe et Liam à l'école", 'Prendre RDV pédiatre (Liam)', 'Équipement de foot pour Zoe',
      'Payer les frais de scolarité (vendredi)', 'Rendez-vous entretien voiture', 'Commander les courses du week-end',
      'Réparer le portail du jardin', "Inscrire au camp d'été", "Organiser le dîner d'anniversaire",
    ],
    cal: [
      { id: 'demo-c1', title: 'Dentiste — Liam',       location: 'Clinique dentaire', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Spectacle de danse de Zoe', location: 'Salle communale', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Cours de natation',     location: 'Piscine',           color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Musée des enfants',     location: null,                color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Dîner chez Mamie',      location: null,                color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: ['Randonnée 🥾', 'Dentiste — Liam', "Récupérer Liam à l'école", "Fête d'anniversaire d'Emma 🎂", 'Entraînement natation — Zoe', 'Spectacle de danse de Zoe 💃', 'Dîner en famille 🍝', 'Réunion parents-profs', 'Anniversaire de Mamie 🎂', 'Soirée film en famille 🎬'],
    journal: [
      "La sortie en famille était géniale, toute cette organisation en valait la peine. Quelques détails en moins auraient suffi, mais au final tout s'est bien passé.",
      'Je dois reprendre ma routine du soir, elle influence énormément ma journée du lendemain. Comparé aux deux dernières semaines où je me sentais au top.',
    ],
    shopping: ['Bananes', 'Tomates cerises', 'Lait entier bio', 'Œufs plein air', 'Fromage cheddar', 'Blanc de poulet', 'Pain au levain', 'Grains de café', "Jus d'orange", 'Liquide vaisselle', 'Lingettes bébé', 'Pâtes'],
    shared: [
      { title: 'Réserver les vacances en famille', day: 3 },
      { title: "Signer l'autorisation scolaire", day: 1 },
      { title: "Acheter le cadeau d'anniversaire d'Emma", day: 5 },
    ],
    orb: "Crée une tâche pour organiser le dîner d'anniversaire et ajoute des fleurs et un gâteau à la liste de courses.",
    dismiss: ['Passer', "C'est parti", 'Suivant', 'Terminé'],
  },
  it: {
    tasks: [
      'Prendere Zoe e Liam a scuola', 'Prenotare visita pediatrica (Liam)', 'Attrezzatura da calcio per Zoe',
      'Pagare le tasse scolastiche (venerdì)', 'Appuntamento tagliando auto', 'Ordinare la spesa per il weekend',
      'Riparare il cancello del giardino', 'Iscrivere al campo estivo', "Organizzare la cena dell'anniversario",
    ],
    cal: [
      { id: 'demo-c1', title: 'Dentista — Liam',       location: 'Studio dentistico', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Saggio di danza di Zoe', location: 'Sala comunale',    color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Corso di nuoto',        location: 'Piscina',           color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Museo dei bambini',     location: null,                color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Cena dalla nonna',      location: null,                color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: ['Escursione 🥾', 'Dentista — Liam', 'Prendere Liam a scuola', 'Festa di compleanno di Emma 🎂', 'Allenamento nuoto — Zoe', 'Saggio di danza di Zoe 💃', 'Cena in famiglia 🍝', 'Riunione genitori-insegnanti', 'Compleanno della nonna 🎂', 'Serata film in famiglia 🎬'],
    journal: [
      "La gita in famiglia è stata fantastica, tutta l'organizzazione ne è valsa la pena. Qualche cosa in meno andava bene, ma alla fine tutto ok.",
      'Devo riprendere la mia routine serale, influenza tantissimo il giorno dopo. Rispetto alle ultime due settimane in cui mi sentivo benissimo.',
    ],
    shopping: ['Banane', 'Pomodorini', 'Latte intero bio', 'Uova bio', 'Formaggio', 'Petto di pollo', 'Pane a lievitazione', 'Caffè in grani', "Succo d'arancia", 'Detersivo piatti', 'Salviette', 'Pasta'],
    shared: [
      { title: 'Prenotare le vacanze in famiglia', day: 3 },
      { title: "Firmare l'autorizzazione scolastica", day: 1 },
      { title: 'Comprare il regalo di compleanno per Emma', day: 5 },
    ],
    orb: "Crea un'attività per organizzare la cena dell'anniversario e aggiungi fiori e torta alla lista della spesa.",
    dismiss: ['Salta', 'Iniziamo', 'Avanti', 'Fatto'],
  },
  es: {
    tasks: [
      'Recoger a Zoe y Liam del colegio', 'Pedir cita al pediatra (Liam)', 'Equipamiento de fútbol para Zoe',
      'Pagar tasas escolares (viernes)', 'Cita revisión del coche', 'Hacer la compra del fin de semana',
      'Arreglar el portón del jardín', 'Inscribir al campamento de verano', 'Planificar la cena de aniversario',
    ],
    cal: [
      { id: 'demo-c1', title: 'Dentista — Liam',          location: 'Clínica dental',  color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Actuación de danza de Zoe', location: 'Sala municipal', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Clase de natación',         location: 'Piscina',        color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Museo de los niños',        location: null,             color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Cena en casa de la abuela', location: null,             color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: [
      'Excursión de senderismo 🥾', 'Dentista — Liam', 'Recoger a Liam del colegio', 'Fiesta de cumpleaños de Emma 🎂',
      'Entrenamiento de natación — Zoe', 'Actuación de danza de Zoe 💃', 'Cena en familia 🍝',
      'Reunión padres-profesores', 'Cumpleaños de la abuela 🎂', 'Noche de cine en familia 🎬',
    ],
    journal: [
      'La escapada familiar fue genial, toda la organización mereció la pena. Algunas cosas sobraban, pero al final todo salió bien.',
      'Necesito volver a mi rutina de tarde, afecta muchísimo a mi día siguiente. Comparado con las dos últimas semanas en que me sentía de maravilla.',
    ],
    shopping: ['Plátanos', 'Tomates cherry', 'Leche entera bio', 'Huevos camperos', 'Queso manchego', 'Pechuga de pollo', 'Pan de masa madre', 'Café en grano', 'Zumo de naranja', 'Lavavajillas', 'Toallitas', 'Pasta'],
    shared: [
      { title: 'Reservar vacaciones en familia', day: 3 },
      { title: 'Firmar autorización del colegio', day: 1 },
      { title: 'Comprar regalo de cumpleaños para Emma', day: 5 },
    ],
    orb: 'Crea una tarea para planificar la cena de aniversario y añade flores y tarta a la lista de la compra.',
    dismiss: ['Saltar', 'Empezar', 'Siguiente', 'Hecho'],
  },
  pt: {
    tasks: [
      'Buscar o Zoe e o Liam na escola', 'Marcar consulta no pediatra (Liam)', 'Equipamento de futebol para o Zoe',
      'Pagar propinas escolares (sexta)', 'Revisão do carro', 'Fazer as compras do fim de semana',
      'Arranjar o portão do jardim', 'Inscrever no campo de verão', 'Planear o jantar de aniversário',
    ],
    cal: [
      { id: 'demo-c1', title: 'Dentista — Liam',        location: 'Clínica dentária', color: '#964735', day: 0, h: 10, dur: 60 },
      { id: 'demo-c2', title: 'Espetáculo de dança da Zoe', location: 'Sala municipal', color: '#EE7BB0', day: 0, h: 18, dur: 90 },
      { id: 'demo-c3', title: 'Aula de natação',         location: 'Piscina',          color: '#964735', day: 2, h: 14, dur: 60 },
      { id: 'demo-c4', title: 'Museu das crianças',      location: null,               color: '#FFC861', day: 4, h: 10, dur: 120 },
      { id: 'demo-c5', title: 'Jantar em casa da avó',   location: null,               color: '#44664F', day: 6, h: 18, m: 30, dur: 150 },
    ],
    future: [
      'Caminhada 🥾', 'Dentista — Liam', 'Buscar o Liam na escola', 'Festa de aniversário da Emma 🎂',
      'Treino de natação — Zoe', 'Espetáculo de dança da Zoe 💃', 'Jantar em família 🍝',
      'Reunião pais-professores', 'Aniversário da avó 🎂', 'Noite de cinema em família 🎬',
    ],
    journal: [
      'A escapada em família foi ótima, toda a organização valeu a pena. Algumas coisas podiam ter ficado de fora, mas no final correu tudo bem.',
      'Preciso de voltar à minha rotina da tarde, afeta muito o dia seguinte. Comparado com as últimas duas semanas em que me sentia ótimo.',
    ],
    shopping: ['Bananas', 'Tomates cherry', 'Leite gordo bio', 'Ovos do campo', 'Queijo', 'Peito de frango', 'Pão de massa mãe', 'Café em grão', 'Sumo de laranja', 'Detergente loiça', 'Lenços húmidos', 'Massa'],
    shared: [
      { title: 'Reservar férias em família', day: 3 },
      { title: 'Assinar autorização da escola', day: 1 },
      { title: 'Comprar presente de aniversário para a Emma', day: 5 },
    ],
    orb: 'Cria uma tarefa para planear o jantar de aniversário e adiciona flores e bolo à lista de compras.',
    dismiss: ['Saltar', 'Vamos lá', 'Seguinte', 'Concluído'],
  },
};
const C = CONTENT[LANG] || CONTENT.en;

// ── Seed demo tasks + rename family members + set language ────────────────────
async function seedData() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (authErr || !auth.user) { console.warn('Seed: auth failed —', authErr?.message); return; }
  const userId = auth.user.id;

  // Force the demo account's language (cloud-synced key → drives the UI on load).
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-language', p_value: LANG });

  const { data: myMembership } = await sb.from('family_members')
    .select('family_id').eq('user_id', userId).eq('is_active', true).maybeSingle();
  const familyId = myMembership?.family_id;

  if (familyId) {
    const { data: members } = await sb.from('family_members')
      .select('id, name').eq('family_id', familyId).eq('is_active', true);
    for (const m of (members || [])) {
      const newName = FAMILY_RENAME[m.name];
      if (newName) { await sb.from('family_members').update({ name: newName }).eq('id', m.id); }
    }
  }

  let memberIds = [];
  if (familyId) {
    const { data: updatedMembers } = await sb.from('family_members')
      .select('user_id').eq('family_id', familyId).eq('is_active', true);
    memberIds = (updatedMembers || []).filter(m => m.user_id !== userId).map(m => m.user_id);
  }

  // Personal to-dos
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'task');
  for (let i = 0; i < C.tasks.length; i++) {
    const sharedWith = memberIds.length > 0 ? [memberIds[i % memberIds.length]] : null;
    await sb.from('tasks').insert({ title: C.tasks[i], type: 'task', user_id: userId, completed: false, shared_with: sharedWith });
  }

  // Personal shopping list (the default "Persönlich" tab reads shopping_personal)
  await sb.from('tasks').delete().eq('user_id', userId).in('type', ['shopping', 'shopping_personal']);
  for (const title of (C.shopping || [])) {
    await sb.from('tasks').insert({ title, type: 'shopping_personal', user_id: userId, completed: false });
  }

  // Shared family tasks (Family Page reads type='shared' with a due_date, ≤60d out)
  await sb.from('tasks').delete().eq('user_id', userId).eq('type', 'shared');
  for (const s of (C.shared || [])) {
    const assignee = memberIds.length > 0 ? memberIds[(s.day) % memberIds.length] : null;
    await sb.from('tasks').insert({
      title: s.title, type: 'shared', user_id: userId, completed: false,
      due_date: evISO(s.day, 9, 0), assigned_to: assignee, family_id: familyId || null,
    });
  }

  // Attendees make events show up on the Family Page (it filters attendees?.length).
  const attendeePool = ['Sarah', 'Liam', 'Zoe', 'Tom'];
  const calendarEvents = C.cal.map((e, i) => ({
    id: e.id, title: e.title, startDate: evISO(e.day, e.h, e.m || 0), endDate: evISO(e.day, e.h, (e.m || 0) + e.dur),
    allDay: false, ...(e.location ? { location: e.location } : {}), type: 'event', color: e.color,
    attendees: attendeePool.slice(0, 2 + (i % 2)),
  }));
  await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-calendar-items', p_value: calendarEvents });

  const { data: prefRow } = await sb.from('user_preferences').select('data').eq('user_id', userId).maybeSingle();
  const channelMsgs = prefRow?.data?.['eazy-family-channel-messages'];
  if (Array.isArray(channelMsgs)) {
    const renamed = channelMsgs.map(m => ({ ...m, authorName: FAMILY_RENAME[m.authorName] || m.authorName }));
    await sb.rpc('upsert_preference', { p_user_id: userId, p_key: 'eazy-family-channel-messages', p_value: renamed });
  }

  const FUTURE_META = [
    { hour: 9, min: 0, daysOut: 2 }, { hour: 10, min: 0, daysOut: 3 }, { hour: 15, min: 30, daysOut: 4 },
    { hour: 16, min: 0, daysOut: 5 }, { hour: 17, min: 0, daysOut: 7 }, { hour: 18, min: 0, daysOut: 8 },
    { hour: 19, min: 0, daysOut: 9 }, { hour: 19, min: 30, daysOut: 11 }, { hour: 12, min: 0, daysOut: 12 },
    { hour: 20, min: 0, daysOut: 14 },
  ];
  const { data: existingEvents } = await sb.from('events').select('id');
  for (let i = 0; i < (existingEvents || []).length; i++) {
    const ev = existingEvents[i];
    const meta = FUTURE_META[i % FUTURE_META.length];
    const d = new Date(TODAY);
    d.setDate(d.getDate() + meta.daysOut);
    d.setHours(meta.hour, meta.min, 0, 0);
    await sb.from('events').update({ title: C.future[i % C.future.length], start_date: d.toISOString() }).eq('id', ev.id);
  }

  console.log(`Seeded ${C.tasks.length} tasks (lang=${LANG}).`);
  await sb.auth.signOut();
}

// ── Phone frame SVGs ──────────────────────────────────────────────────────────
function shadowSVG() {
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="blur" x="-12%" y="-6%" width="128%" height="116%"><feGaussianBlur stdDeviation="44"/></filter></defs>
  <rect x="40" y="68" width="1500" height="3120" rx="155" fill="rgba(0,0,0,0.52)" filter="url(#blur)"/>
</svg>`;
}
function bezelSVG() {
  const diW = 378, diH = 108, diX = FR_W / 2 - diW / 2, diY = SCR_Y + 33;
  const hiW = 360, hiH = 15,  hiX = FR_W / 2 - hiW / 2, hiY = SCR_Y + SCR_H - 90;
  return `<svg width="${FR_W}" height="${FR_H}" xmlns="http://www.w3.org/2000/svg">
  <defs><mask id="hole"><rect width="${FR_W}" height="${FR_H}" fill="white"/><rect x="${SCR_X}" y="${SCR_Y}" width="${SCR_W}" height="${SCR_H}" rx="55" fill="black"/></mask></defs>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="#1C1C1E" mask="url(#hole)"/>
  <rect x="40" y="40" width="1500" height="3120" rx="155" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" mask="url(#hole)"/>
  <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="54" fill="#080808"/>
  <rect x="${hiX}" y="${hiY}" width="${hiW}" height="${hiH}" rx="7" fill="rgba(255,255,255,0.35)"/>
  <rect x="23" y="520" width="16" height="76"  rx="8" fill="#2A2A2D"/>
  <rect x="23" y="636" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="23" y="796" width="16" height="118" rx="8" fill="#2A2A2D"/>
  <rect x="1541" y="700" width="16" height="156" rx="8" fill="#2A2A2D"/>
</svg>`;
}
async function applyFrame(rawPath, outPath) {
  const [shadowBuf, bezelBuf] = await Promise.all([
    sharp(Buffer.from(shadowSVG())).png().toBuffer(),
    sharp(Buffer.from(bezelSVG())).png().toBuffer(),
  ]);
  await sharp({ create: { width: FR_W, height: FR_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shadowBuf, top: 0, left: 0 }, { input: rawPath, top: SCR_Y, left: SCR_X }, { input: bezelBuf, top: 0, left: 0 }])
    .flatten({ background: '#F0ECE6' }).png().toFile(outPath);
  console.log(`   ✓  ${path.basename(outPath)}`);
}

async function emulateSafeArea(page) {
  await page.evaluate((safePx) => {
    document.querySelectorAll('[style]').forEach(el => {
      const s = el.style;
      if (s.paddingTop && s.paddingTop.includes('env(')) s.paddingTop = safePx + 'px';
      if (s.marginTop && s.marginTop.includes('env(')) s.marginTop = safePx + 'px';
      if (s.top && s.top.includes('env(')) s.top = safePx + 'px';
      if (s.paddingBottom && s.paddingBottom.includes('env(')) s.paddingBottom = '34px';
    });
    const header = document.querySelector('header.fixed');
    const main = document.querySelector('main');
    if (header && main) main.style.paddingTop = header.getBoundingClientRect().height + 'px';
  }, SAFE_TOP);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function seedCalendar(page) {
  const pool = ['Sarah', 'Liam', 'Zoe', 'Tom'];
  await page.evaluate((events) => localStorage.setItem('eazy-family-calendar-items', JSON.stringify(events)),
    C.cal.map((e, i) => ({ id: e.id, title: e.title, startDate: evISO(e.day, e.h, e.m || 0), endDate: evISO(e.day, e.h, (e.m || 0) + e.dur), allDay: false, ...(e.location ? { location: e.location } : {}), type: 'event', color: e.color, attendees: pool.slice(0, 2 + (i % 2)) })));
}

async function seedRitualsAndJournal(page) {
  await page.evaluate((journal) => {
    localStorage.setItem('eazy-completed-rituals-today', JSON.stringify({ date: new Date().toDateString(), ids: ['r1', 'r3'] }));
    const now = new Date();
    const entries = [
      { id: 'j1', text: journal[0], date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15).toISOString() },
      { id: 'j2', text: journal[1], date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 42).toISOString() },
    ];
    localStorage.setItem('eazy-journal-entries', JSON.stringify(entries));
  }, C.journal);
}

async function captureScreens(page) {
  await page.goto(`${BASE_URL}/app`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await seedCalendar(page);

  const go = async (url, ms = 2800) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(ms);
    await emulateSafeArea(page);
  };
  const shot = async (name) => {
    const raw = path.join(OUT_RAW, `${name}.png`);
    await page.screenshot({ path: raw, fullPage: false });
    await applyFrame(raw, path.join(OUT_FRAMED, `${name}.png`));
  };
  const dismiss = async () => {
    const sels = [...C.dismiss.map(t => `button:has-text("${t}")`), 'button[aria-label="Skip tour"]'];
    for (const sel of sels) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 }).catch(() => false)) { await el.click(); await page.waitForTimeout(400); }
    }
  };

  const step = async (label, fn) => {
    console.log(label);
    try { await fn(); } catch (e) { console.warn(`   ! ${label} skipped: ${String(e.message || e).split('\n')[0]}`); }
  };

  await step('\n[1/7] Home', async () => {
    await go(`${BASE_URL}/app`); await dismiss();
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('01-home');
  });

  await step('[2/7] Orb / EZCapture', async () => {
    await go(`${BASE_URL}/app`); await dismiss();
    // The EZ button is driven by pointer events with a tap-vs-drag threshold, so
    // a quick mouse down→up (not .click()) is what registers as a tap and opens it.
    const box = await page.locator('[data-tutorial="orb"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up();
    await page.waitForTimeout(1600);
    const orbInput = page.locator('textarea').last();
    await orbInput.waitFor({ state: 'visible', timeout: 8000 });
    await orbInput.fill(C.orb);
    await page.waitForTimeout(500);
    await shot('02-orb');
  });

  await step('[3/7] Calendar', async () => { await go(`${BASE_URL}/app/calendar`); await shot('03-calendar'); });
  await step('[4/7] Shopping', async () => { await go(`${BASE_URL}/app/shopping`); await shot('04-shopping'); });
  await step('[5/7] Family Page', async () => { await go(`${BASE_URL}/app/family-agenda`); await shot('05-family'); });
  await step('[6/7] Rituals', async () => {
    await seedRitualsAndJournal(page);
    await go(`${BASE_URL}/app/rituals`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('06-rituals');
  });
  await step('[7/7] Tasks', async () => { await go(`${BASE_URL}/app/todos`); await shot('07-tasks'); });
}

async function main() {
  console.log(`Seeding demo data (lang=${LANG})…`);
  await seedData();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VP_W, height: VP_H }, deviceScaleFactor: DPR,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  console.log('Logging in…');
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app**', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Force the UI language locally (belt-and-suspenders with the cloud pref) and
  // suppress the first-run welcome banner, then reload so i18n initialises in the
  // right language from the very first render and the banner is gone.
  await page.evaluate((lng) => {
    localStorage.setItem('eazy-family-language', lng);
    localStorage.setItem('eazy-tour-banner-dismissed', 'true');
  }, LANG);
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  console.log(`Logged in (UI lang=${LANG}).`);

  await captureScreens(page);
  await browser.close();
  console.log(`\nDone.\n  Raw:    screenshots/raw${SUFFIX}/\n  Framed: screenshots/framed${SUFFIX}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
