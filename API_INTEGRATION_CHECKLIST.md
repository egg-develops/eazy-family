# Eazy.Family API Integration Checklist
**Role:** Backend Integration Lead  
**Timeline:** 2 weeks (MVP launch Week 2)  
**Last Updated:** 2026-03-13

---

## Executive Summary

Backend wiring is **~70% complete** across all 5 MVP features. Google Calendar, Marketplace, and Community Groups are **fully wired**. Events (Find Events Near Me) has **integration issues** that need fixing. **Messaging is completely unwired** and requires database schema, hooks, and component implementation.

**Critical Path:** Fix Events data flow + implement Messaging (both are blocking for full MVP launch).

---

## 📋 Feature-by-Feature Status

### 1. ✅ Google Calendar Integration
**Status: FULLY WIRED** | Commit: `240a108e`

#### API Endpoints
- `POST /functions/v1/google-calendar-oauth-callback` — OAuth callback, token storage, event sync
- `GET /functions/v1/sync-google-calendar` — Manual sync trigger
- Supabase tables: `calendar_integrations`, `synced_calendar_events`

#### Frontend Implementation
- **Hook:** `useGoogleCalendar.ts` ✅
  - `initiateOAuth()`, `handleOAuthCallback()`, `syncCalendar()`, `disconnectCalendar()`
  - Real-time subscriptions working
  - Token refresh logic implemented

- **Components:** 
  - `GoogleCalendarSettings.tsx` ✅ — Settings page integration
  - `GoogleCalendarCallback.tsx` ✅ — OAuth redirect handler
  - `SyncedCalendarEventsDisplay.tsx` ✅ — Event display component

#### Data Flow
✅ User clicks "Connect" → Google OAuth → Token stored in DB → Events synced → Real-time updates

#### Known Issues
- None currently blocking

#### QA Checklist
- [ ] OAuth flow tested end-to-end
- [ ] Tokens refresh before expiry
- [ ] Events appear 7 days in advance
- [ ] Disconnect revokes access properly

---

### 2. ✅ Marketplace
**Status: FULLY WIRED** | Commit: `5606b1ab`

#### API Endpoints
- Supabase table: `marketplace_items` (public)
- RLS: Public read, users can only edit/delete own items

#### Frontend Implementation
- **Hook:** `useMarketplaceItems.ts` ✅
  - `createItem()`, `updateItem()`, `deleteItem()`
  - Real-time subscriptions active
  - Proper error handling

- **Component:** `Community.tsx` (Marketplace tab) ✅
  - Add Item dialog with form validation
  - Search and category filtering
  - Item display cards with condition badges

#### Data Flow
✅ Form submission → Supabase insert → Real-time update → Display in list

#### Data Structure Mismatch
**NONE** — Hook output matches component expectations

#### Known Issues
- [ ] None currently

#### QA Checklist
- [ ] Create item appears immediately in list
- [ ] Search filters work
- [ ] Category dropdowns populate correctly
- [ ] Only sellers can delete own items

---

### 3. ✅ Community Groups
**Status: FULLY WIRED** | Commit: `5606b1ab`

#### API Endpoints
- Supabase tables: `groups`, `group_members` (relational)
- RLS: Users see public groups + groups they're members of

#### Frontend Implementation
- **Hook:** `useGroups.ts` ✅
  - `createGroup()`, `joinGroup()`, `leaveGroup()`, `deleteGroup()`
  - Member count tracking
  - Real-time subscriptions

- **Component:** `Community.tsx` (Groups tab) ✅
  - Create Group dialog with category selection
  - Groups list with join/leave buttons
  - Public/private toggle

#### Data Flow
✅ Form submission → Group created → User auto-added as member → Real-time member updates

#### Data Structure Mismatch
**NONE** — All fields properly mapped

#### Known Issues
- [ ] None currently

#### QA Checklist
- [ ] Create group → appears in list
- [ ] Join/leave → member count updates
- [ ] Private groups → only members see

---

### 4. ⚠️ Find Events Near Me (Events Feature)
**Status: PARTIALLY WIRED** | Commit: `5606b1ab` | **BLOCKERS IDENTIFIED**

#### API Endpoints
- Supabase table: `events` (user/family scoped)
- Mock: Location-based filtering not yet implemented in frontend

#### Frontend Implementation
- **Hook:** `useEvents.ts` ✅
  - Loads all events from Supabase
  - Real-time subscriptions working
  - CRUD operations functional

- **Component:** `Events.tsx` ⚠️ **HAS CRITICAL ISSUES**

#### Data Structure Mismatch — **CRITICAL**

**Events.tsx expects:**
```typescript
interface DisplayEvent {
  id, title, description, date, time, location, type, price, image, 
  ageRange  // ← NOT IN SUPABASE
}
```

**Supabase provides:**
```typescript
interface Event {
  id, user_id, title, description, start_date, end_date, location, 
  color, reminder, repeat, travel_time
  // NO: ageRange, price, type fields
}
```

**Mismatches:**
| Field | Expected | Actual | Issue |
|-------|----------|--------|-------|
| `date` | 'YYYY-MM-DD' | start_date (ISO) | ✅ Can transform |
| `time` | 'HH:mm - HH:mm' | start_date, end_date | ✅ Can calculate |
| `ageRange` | Badge text | ✗ Not in DB | ❌ **MISSING** |
| `price` | CHF amount | ✗ Not in DB | ❌ **MISSING** |
| `type` | Category | ✗ Not in DB | ❌ **MISSING** |
| `image` | CSS class | `color` field | ✅ Can use color |

#### Code Issues
**Events.tsx, line 57:**
```typescript
// ERROR: These properties don't exist in supabaseEvent
<Badge variant="secondary" className="text-xs">
  {event.ageRange}  // ← UNDEFINED
</Badge>
<span className="font-medium text-primary">{event.price}</span>  // ← UNDEFINED
```

#### Solution Path
1. **Update Supabase schema** — Add missing fields to events table:
   - `age_range: text` (e.g., "4-8 years")
   - `price: decimal` (CHF)
   - `event_type: text` (family-event, workshop, outdoor, etc.)

2. **Update Events.tsx** — Fix data mapping:
   ```typescript
   const transformedEvents: DisplayEvent[] = supabaseEvents.map(event => ({
     id: event.id,
     title: event.title,
     description: event.description,
     date: format(new Date(event.start_date), 'yyyy-MM-dd'),
     time: `${format(new Date(event.start_date), 'HH:mm')} - ${format(new Date(event.end_date), 'HH:mm')}`,
     location: event.location,
     type: event.event_type || 'family-event',
     price: event.price ? `CHF ${event.price}` : 'Free',
     ageRange: event.age_range || 'All ages',
     image: event.color ? `bg-${event.color}` : 'bg-blue-200'
   }));
   ```

3. **Location-based filtering** — Frontend currently shows hardcoded "Zurich Area":
   - Implement geolocation via browser Geolocation API
   - Add distance filter logic (5km, 10km, 20km, 50km)
   - Calculate distance from user location to event location

#### Known Issues
- [ ] **CRITICAL:** ageRange property undefined (line 57)
- [ ] **CRITICAL:** price property undefined (line 57)
- [ ] **HIGH:** Missing event_type field in schema
- [ ] **HIGH:** Location-based filtering not implemented (mock "Zurich Area")
- [ ] **MEDIUM:** No geolocation permission handling

#### QA Checklist
- [ ] Supabase schema updated with age_range, price, event_type
- [ ] Events page loads without console errors
- [ ] All event properties display correctly
- [ ] Location filtering works (geolocation prompt)
- [ ] Distance filters apply correctly

---

### 5. ❌ Messaging (Group & Family Chat)
**Status: NOT STARTED** | **CRITICAL PATH BLOCKER**

#### Current State
- Placeholder UI in `Community.tsx` (Messages tab)
- Shows "Coming Soon" card
- No database schema
- No hooks
- No components

#### Required Implementation

#### Database Schema (NEW)
Create `supabase/migrations/20260313_005_messaging.sql`:

```sql
-- Messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  media_url text,
  media_type text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Conversations (group chats or DMs)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text DEFAULT 'group', -- 'group', 'direct'
  name text, -- NULL for DMs
  description text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Conversation members (who can access which conversations)
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- RLS Policies
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_members WHERE user_id = auth.uid()
    )
  );

-- Similar RLS policies for conversations and conversation_members
```

#### Hook: `useMessaging.ts` (NEW)
Implement with:
```typescript
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
}

interface Conversation {
  id: string;
  type: 'group' | 'direct';
  name: string;
  description?: string;
  members: User[];
  last_message?: Message;
  unread_count: number;
}

export function useMessaging() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Operations:
  // - loadConversations() ← Auto-subscribe for real-time updates
  // - loadMessages(conversationId) ← Load message history
  // - sendMessage(conversationId, content, mediaUrl?) ← Send message
  // - createConversation(name, type, members) ← Start new chat
  // - addMember(conversationId, userId) ← Add user to group
  // - removeMember(conversationId, userId) ← Remove user
  // - deleteConversation(conversationId) ← Delete chat
  // - markAsRead(conversationId) ← Clear unread badge
}
```

#### Component: `MessagingTab.tsx` (NEW)
In `Community.tsx`, replace placeholder with:
- Conversation list (sidebar)
- Message display area (center)
- Input field with send button
- Real-time message streaming
- Typing indicators (optional)
- Member list for groups

#### Data Flow
```
User selects/creates conversation
    ↓
loadMessages() → Fetch from Supabase
    ↓
useMessaging() subscribes to postgres_changes
    ↓
User types message → sendMessage()
    ↓
Message inserted to DB → Real-time update
    ↓
Other members' clients receive update instantly
```

#### Complexity Estimation
- **Database schema:** 1-2 hours
- **Hook implementation:** 2-3 hours
- **Component UI:** 2-3 hours
- **Testing:** 1-2 hours
- **Total:** ~6-10 hours (high priority)

#### Known Issues / Blockers
- [ ] **CRITICAL:** Schema doesn't exist yet
- [ ] **CRITICAL:** No React hook implementation
- [ ] **CRITICAL:** Placeholder UI needs replacement
- [ ] **HIGH:** Media upload support (optional v1.1)
- [ ] **MEDIUM:** Typing indicators (optional)
- [ ] **MEDIUM:** Message editing/deletion

#### QA Checklist
- [ ] Create conversation
- [ ] Send message → appears immediately in chat
- [ ] Real-time updates (other users see message)
- [ ] Load message history (pagination)
- [ ] Unread badge shows count
- [ ] Add/remove members from group
- [ ] Delete conversation

---

## 🎯 Implementation Priority Matrix

| Feature | Wiring % | Blocker? | Effort | Priority |
|---------|----------|----------|--------|----------|
| Google Calendar | 100% | No | Done | ✅ |
| Marketplace | 100% | No | Done | ✅ |
| Community Groups | 100% | No | Done | ✅ |
| Events (Find Near Me) | 60% | **YES** | 3-4h | 🔴 CRITICAL |
| Messaging | 10% | **YES** | 6-10h | 🔴 CRITICAL |

---

## 🔧 Code Quality Issues

### Events.tsx - Critical Bugs
1. **Line 57:** `event.ageRange` is undefined
2. **Line 59:** `event.price` is undefined
3. **Line 87:** `event.ageRange` used in badge
4. **Data transform:** Missing type/category information

### Messaging - Complete Missing
1. No database schema
2. No React hook
3. Placeholder UI only

---

## 📊 Test Data Requirements

### Events
```typescript
// Add test events to Supabase with:
{
  title: "Kids Coding Workshop",
  start_date: "2026-03-15T10:00:00Z",
  end_date: "2026-03-15T12:00:00Z",
  location: "Zurich Tech Hub",
  age_range: "6-12 years",    // ← NEW
  price: 25.00,               // ← NEW
  event_type: "educational",  // ← NEW
  color: "bg-blue-200"
}
```

### Messaging
```typescript
// Create test conversation:
{
  type: "group",
  name: "Family Chat",
  created_by: "user-uuid"
}

// Add test members:
// - user1 (creator)
// - user2
// - user3

// Send test messages:
[
  { sender_id: user1, content: "Hey family!" },
  { sender_id: user2, content: "Hi everyone!" },
  { sender_id: user3, content: "What's for dinner?" }
]
```

---

## 🚀 Deployment Checklist

### Pre-Launch (This Week)
- [ ] **Events:** Fix schema + update Events.tsx
- [ ] **Messaging:** Implement schema + hook + component
- [ ] **All features:** Run end-to-end test flow
- [ ] **All features:** Verify RLS policies working
- [ ] **QA:** Complete testing checklist for each feature

### Supabase Configuration
- [ ] Confirm all RLS policies enabled
- [ ] Verify `user-uploads` storage bucket exists
- [ ] Check indexes created for performance
- [ ] Confirm realtime subscriptions active
- [ ] Set up function environment variables

### Environment
- [ ] `.env` has all required vars (GOOGLE_CALENDAR_CLIENT_ID, etc.)
- [ ] Supabase secrets set (GOOGLE_CALENDAR_CLIENT_SECRET, etc.)
- [ ] Google OAuth credentials configured
- [ ] Functions deployed and accessible

---

## 📞 Coordination Notes

### With Design Lead (UX)
- **Google Calendar:** ✅ Design finalized
- **Marketplace:** ✅ Design finalized
- **Community Groups:** ✅ Design finalized
- **Events:** ⚠️ May need age range + price field tweaks in UI
- **Messaging:** 🔴 **NEEDS DESIGN** before implementation

### With QA Lead
- **Critical path:** Events fix + Messaging implementation must be tested
- **Timeline:** Need QA on both by end of Week 1
- **Test data:** Will provide setup script for Supabase seed data

---

## 📁 Files to Create/Modify

### Create (NEW)
```
src/hooks/useMessaging.ts
src/components/MessagingTab.tsx (or extend existing)
supabase/migrations/20260313_005_messaging.sql
```

### Modify
```
src/pages/Events.tsx  (fix data transform)
src/pages/Community.tsx  (replace messages placeholder)
supabase/migrations/20260309_001_add_core_features.sql  (add event fields)
```

### No Changes Needed
```
src/hooks/useGoogleCalendar.ts ✅
src/hooks/useMarketplaceItems.ts ✅
src/hooks/useGroups.ts ✅
src/hooks/useEvents.ts ✅
src/components/GoogleCalendarSettings.tsx ✅
src/pages/Settings.tsx ✅
```

---

## ✨ Success Metrics

By end of Week 2:
- ✅ All 5 MVP features fully wired to APIs
- ✅ Zero undefined property errors in console
- ✅ Real-time data sync working for all features
- ✅ All QA checklists passing
- ✅ App ready for App Store submission

---

## 🔄 Next Steps (Priority Order)

1. **TODAY:** 
   - Fix Events.tsx data transform (30 min)
   - Update events table schema with age_range, price, event_type (30 min)
   - Verify Events page loads without errors (15 min)

2. **TOMORROW:**
   - Design Messaging UI (coordinate with Design Lead)
   - Create database schema for messaging
   - Implement useMessaging hook
   - Implement MessagingTab component

3. **BY END OF WEEK 1:**
   - Deploy all changes to staging
   - Run full QA cycle on all features
   - Fix any blockers found in testing

4. **WEEK 2:**
   - Final polish and optimization
   - App Store submission prep
   - Launch!

---

**Report Generated:** 2026-03-13  
**Next Review:** 2026-03-14 (EOD)  
**Status:** ON TRACK (with 2 critical items to complete)
