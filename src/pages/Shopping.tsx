import { useState, useEffect, useRef } from "react";
import { Plus, Minus, Trash2, Mic, MicOff, Barcode, Sparkles, Camera, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ShoppingItem {
  id: string;
  title: string;
  completed: boolean;
  quantity: number;
  category: string;
  listType: 'personal' | 'shared';
}

const CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Household', 'Baby', 'Drinks', 'Other'];

const guessCategory = (title: string): string => {
  const t = title.toLowerCase();
  if (/apple|banana|orange|lettuce|tomato|carrot|spinach|fruit|vegetable|avocado/.test(t)) return 'Produce';
  if (/milk|cheese|yogurt|butter|cream|egg/.test(t)) return 'Dairy';
  if (/chicken|beef|pork|fish|salmon|meat|turkey/.test(t)) return 'Meat';
  if (/bread|bagel|muffin|cake|pastry/.test(t)) return 'Bakery';
  if (/paper|soap|detergent|cleaning|towel|toilet/.test(t)) return 'Household';
  if (/diaper|formula|baby|puree/.test(t)) return 'Baby';
  if (/water|juice|coffee|tea|beer|wine|soda/.test(t)) return 'Drinks';
  return 'Other';
};

const TC = '#964735';
const TL = '#D97B66';
const CARD = '#FFFFFF';
const BORDER = '#DAC1BB';
const MUTED = '#7A6660';
const BG = '#F7F3ED';

const Shopping = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [listType, setListType] = useState<'personal' | 'shared'>('shared');
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const isListeningRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const capturedRef = useRef('');
  const baseTextRef = useRef('');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase.from('tasks').select('*').eq('type', 'shopping').order('created_at', { ascending: true });
      setItems((data || []).map(d => ({
        id: d.id,
        title: d.title,
        completed: d.completed,
        quantity: 1,
        category: guessCategory(d.title),
        listType: 'shared' as const,
      })));
      setLastSynced(new Date());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const addItem = async () => {
    if (!newItem.trim() || !user) return;
    haptic('light');
    try {
      const { data } = await supabase.from('tasks').insert({
        title: newItem.trim(), type: 'shopping', user_id: user.id, completed: false
      }).select().single();
      if (data) {
        setItems(prev => [...prev, {
          id: data.id, title: data.title, completed: false,
          quantity: 1, category: guessCategory(data.title), listType,
        }]);
      }
      setNewItem('');
    } catch { toast({ title: 'Could not add item', variant: 'destructive' }); }
  };

  const toggleItem = async (id: string) => {
    haptic('light');
    const item = items.find(i => i.id === id);
    if (!item) return;
    setItems(prev => prev.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
    await supabase.from('tasks').update({ completed: !item.completed }).eq('id', id);
  };

  const updateQty = (id: string, delta: number) => {
    haptic('light');
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const deleteItem = async (id: string) => {
    haptic('light');
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  };

  const clearCompleted = async () => {
    haptic('medium');
    const completedIds = items.filter(i => i.completed).map(i => i.id);
    if (!completedIds.length) return;
    setItems(prev => prev.filter(i => !i.completed));
    await supabase.from('tasks').delete().in('id', completedIds);
    toast({ title: `${completedIds.length} item${completedIds.length > 1 ? 's' : ''} removed` });
  };

  const stopListening = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast({ title: 'Voice input not supported in this browser' }); return; }
    capturedRef.current = '';
    baseTextRef.current = '';
    isListeningRef.current = true;

    const spawnSession = (): any => {
      const r = new SR();
      r.lang = navigator.language || 'en-US';
      r.interimResults = true;
      r.continuous = true;
      r.maxAlternatives = 1;

      r.onresult = (e: any) => {
        let sessionText = '';
        for (let i = 0; i < e.results.length; i++) sessionText += e.results[i][0].transcript;
        const combined = baseTextRef.current ? `${baseTextRef.current} ${sessionText}` : sessionText;
        capturedRef.current = combined;
        setNewItem(combined);
      };

      r.onend = () => {
        if (!isListeningRef.current) {
          setIsListening(false);
          if (capturedRef.current.trim()) setNewItem(capturedRef.current);
          return;
        }
        baseTextRef.current = capturedRef.current;
        try {
          const next = spawnSession();
          recognitionRef.current = next;
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      r.onerror = (e: any) => {
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        if (e.error === 'not-allowed') toast({ title: 'Microphone access denied', description: 'Allow microphone in your browser settings.' });
        isListeningRef.current = false;
        setIsListening(false);
      };

      try { r.start(); } catch { isListeningRef.current = false; setIsListening(false); }
      return r;
    };

    recognitionRef.current = spawnSession();
    setIsListening(true);
    haptic('light');
  };

  const filtered = items.filter(i => listType === 'shared' || i.listType === listType);
  const uncompleted = filtered.filter(i => !i.completed);
  const completed = filtered.filter(i => i.completed);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = uncompleted.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  return (
    <div className="space-y-3 p-4" style={{ paddingBottom: '2rem' }}>

      {/* Hidden camera input */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={() => toast({ title: 'Camera capture coming soon', description: 'AI will extract items from your photo.' })}
      />

      {/* Sync row */}
      <div className="flex items-center justify-between">
        <button onClick={load} className="flex items-center gap-1.5 text-xs" style={{ color: MUTED }}>
          <RefreshCw className="w-3 h-3" />
          Last synced: {format(lastSynced, 'h:mm a')}
        </button>
        {/* Personal / Shared toggle */}
        <div className="flex rounded-full p-0.5" style={{ background: BG, border: `1px solid ${BORDER}` }}>
          {(['personal', 'shared'] as const).map(t => (
            <button key={t} onClick={() => setListType(t)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{ background: listType === t ? TC : 'transparent', color: listType === t ? '#fff' : MUTED }}
            >
              {t === 'shared' ? 'Shared' : 'Personal'}
            </button>
          ))}
        </div>
      </div>

      {/* Add item bar */}
      <div className="flex items-center rounded-2xl px-3 py-2.5 gap-2" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <button onClick={addItem} className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: newItem.trim() ? TC : '#F1EDE7' }}>
          <Plus className="w-3.5 h-3.5" style={{ color: newItem.trim() ? '#fff' : MUTED }} />
        </button>
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add an item…"
          className="flex-1 outline-none text-sm"
          style={{ color: '#1C1C18', background: 'transparent' }}
        />
        <button onClick={() => cameraInputRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: '#F1EDE7' }}>
          <Camera className="w-3.5 h-3.5" style={{ color: MUTED }} />
        </button>
        <button className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0" style={{ background: '#F1EDE7' }}>
          <Barcode className="w-3.5 h-3.5" style={{ color: MUTED }} />
        </button>
        <button onClick={isListening ? stopListening : startListening}
          className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-colors"
          style={{ background: isListening ? '#8FB399' : '#F1EDE7' }}>
          {isListening ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5" style={{ color: MUTED }} />}
        </button>
      </div>

      {/* Smart suggestion card */}
      <div className="rounded-2xl px-4 py-3 flex items-start gap-3" style={{ background: '#EEF4F0', border: '1px solid #C8DDD0' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#44664F' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <p className="flex-1 text-sm leading-snug pt-0.5" style={{ color: '#44664F' }}>
          Add items above, take a picture of your recipe list or Tap EZ Orbe to use voice — I'll add all the items.
        </p>
      </div>

      {/* Grouped uncompleted items */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="space-y-1.5">
          <p className="text-xs font-semibold tracking-widest uppercase px-1" style={{ color: MUTED }}>{cat}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {catItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: CARD, borderBottom: idx < catItems.length - 1 ? `1px solid #F1EDE7` : 'none' }}>
                {/* Checkbox — rounded square, text height */}
                <button onClick={() => toggleItem(item.id)}
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ border: `1.5px solid ${item.completed ? TC : '#C4AEA8'}`, background: item.completed ? TC : 'transparent' }}>
                  {item.completed && <span className="text-white" style={{ fontSize: '9px', lineHeight: 1 }}>✓</span>}
                </button>
                {/* Title */}
                <span className="flex-1 text-sm" style={{ color: item.completed ? MUTED : '#1C1C18', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                {/* Assignee */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ background: TL, fontSize: '8px', fontWeight: 700 }}>
                  {(user?.email?.[0] || 'U').toUpperCase()}
                </div>
                <button className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F1EDE7', border: `1px dashed ${BORDER}` }}>
                  <Users className="w-2.5 h-2.5" style={{ color: MUTED }} />
                </button>
                {/* Quantity pill */}
                <div className="flex items-center rounded-full flex-shrink-0" style={{ background: '#F1EDE7', padding: '2px 6px', gap: '4px' }}>
                  <button onClick={() => updateQty(item.id, -1)} className="text-xs font-medium leading-none" style={{ color: MUTED, width: '14px', textAlign: 'center' }}>−</button>
                  <span className="text-xs font-semibold" style={{ color: '#1C1C18', minWidth: '14px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="text-xs font-medium leading-none" style={{ color: MUTED, width: '14px', textAlign: 'center' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Completed items */}
      {completed.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: MUTED }}>Completed</p>
            <button onClick={clearCompleted} className="flex items-center gap-1 text-xs font-semibold" style={{ color: MUTED }}>
              <RefreshCw className="w-3 h-3" />
              Remove all
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {completed.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: CARD, borderBottom: idx < completed.length - 1 ? `1px solid #F1EDE7` : 'none' }}>
                <button onClick={() => toggleItem(item.id)}
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: TC, border: `2px solid ${TC}` }}>
                  <span className="text-white" style={{ fontSize: '9px', lineHeight: 1 }}>✓</span>
                </button>
                <span className="flex-1 text-sm line-through" style={{ color: MUTED }}>{item.title}</span>
                <button onClick={() => deleteItem(item.id)}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: '#DAC1BB' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🛒</p>
          <p className="font-semibold" style={{ color: '#1C1C18' }}>Your list is empty</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Add items above or use EZ Capture</p>
        </div>
      )}
    </div>
  );
};

export default Shopping;
