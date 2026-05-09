import { useState, useEffect } from "react";
import { Plus, Minus, Trash2, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptic";
import { useToast } from "@/hooks/use-toast";

interface ShoppingItem {
  id: string;
  title: string;
  completed: boolean;
  quantity: number;
  category: string;
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

const Shopping = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = { current: null as any };

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('tasks').select('*').eq('type', 'shopping').order('created_at', { ascending: true });
      setItems((data || []).map(d => ({
        id: d.id,
        title: d.title,
        completed: d.completed,
        quantity: 1,
        category: guessCategory(d.title),
      })));
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const addItem = async () => {
    if (!newItem.trim() || !user) return;
    haptic('light');
    try {
      const { data } = await supabase.from('tasks').insert({ title: newItem.trim(), type: 'shopping', user_id: user.id, completed: false }).select().single();
      if (data) {
        setItems(prev => [...prev, { id: data.id, title: data.title, completed: false, quantity: 1, category: guessCategory(data.title) }]);
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

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.onresult = (e: any) => { setNewItem(e.results[0][0].transcript); };
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
    setIsListening(true);
    haptic('light');
  };

  // Group by category, uncompleted first
  const uncompleted = items.filter(i => !i.completed);
  const completed = items.filter(i => i.completed);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = uncompleted.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const TC = '#964735'; // terracotta
  const TL = '#D97B66'; // terracotta light
  const CARD = '#FFFFFF';
  const BORDER = '#DAC1BB';
  const MUTED = '#7A6660';

  return (
    <div className="space-y-4 p-4" style={{ paddingBottom: '2rem' }}>

      {/* Add item bar */}
      <div className="flex gap-2 items-center rounded-2xl px-4 py-3" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
        <button onClick={addItem} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full" style={{ background: TC, color: '#fff' }}>
          <Plus className="w-4 h-4" />
        </button>
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add an item…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#1C1C18' }}
        />
        <button onClick={isListening ? () => { recognitionRef.current?.stop(); setIsListening(false); } : startListening}
          className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
          style={{ background: isListening ? TL : '#F1EDE7' }}>
          {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" style={{ color: MUTED }} />}
        </button>
      </div>

      {/* Grouped uncompleted items */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase px-1" style={{ color: MUTED }}>{cat}</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {catItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={{ background: CARD, borderBottom: idx < catItems.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                  style={{ borderColor: item.completed ? TC : BORDER, background: item.completed ? TC : 'transparent' }}
                >
                  {item.completed && <span className="text-white text-xs">✓</span>}
                </button>
                <span className="flex-1 text-sm" style={{ color: '#1C1C18', textDecoration: item.completed ? 'line-through' : 'none' }}>{item.title}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#F1EDE7' }}>
                    <Minus className="w-3 h-3" style={{ color: MUTED }} />
                  </button>
                  <span className="w-5 text-center text-sm font-medium" style={{ color: '#1C1C18' }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#F1EDE7' }}>
                    <Plus className="w-3 h-3" style={{ color: MUTED }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Completed items */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase px-1" style={{ color: MUTED }}>Completed</p>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {completed.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3" style={{ background: CARD, borderBottom: idx < completed.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                <button onClick={() => toggleItem(item.id)} className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: TC, border: `2px solid ${TC}` }}>
                  <span className="text-white text-xs">✓</span>
                </button>
                <span className="flex-1 text-sm line-through" style={{ color: MUTED }}>{item.title}</span>
                <button onClick={() => deleteItem(item.id)}><Trash2 className="w-4 h-4" style={{ color: '#DAC1BB' }} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-3">🛒</p>
          <p className="font-semibold" style={{ color: '#1C1C18' }}>Your list is empty</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>Add items above or tap the EZ button</p>
        </div>
      )}
    </div>
  );
};

export default Shopping;
