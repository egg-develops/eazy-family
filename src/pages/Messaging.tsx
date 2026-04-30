import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MessageCircle, Search, Users, Send, ArrowLeft,
  Image as ImageIcon, X, Loader2,
} from "lucide-react";
import { error as logError } from "@/lib/logger";
import { compressAndUpload } from "@/lib/imageUpload";
import { haptic } from "@/lib/haptic";

interface FamilyMember { user_id: string; name: string }

interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  read_at: string | null;
}

interface FamilyMessage {
  id: string;
  family_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
}

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const Messaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"family" | "direct">("family");

  // Family chat
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [familyMessages, setFamilyMessages] = useState<FamilyMessage[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [memberMap, setMemberMap] = useState<Map<string, string>>(new Map());

  // Direct messages
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Shared
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const familyEndRef = useRef<HTMLDivElement>(null);
  const directFileRef = useRef<HTMLInputElement>(null);
  const familyFileRef = useRef<HTMLInputElement>(null);
  const notifPermRef = useRef<NotificationPermission>("default");

  // ── Notifications ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!("Notification" in window)) return;
    notifPermRef.current = Notification.permission;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(p => { notifPermRef.current = p; });
    }
  }, []);

  const showNotif = (sender: string, body: string) => {
    if (notifPermRef.current === "granted" && document.visibilityState !== "visible") {
      new Notification(sender, { body: body || "📷 Image", icon: "/logo.png" });
    }
  };

  // ── Load family members + family ID ───────────────────────────────────
  useEffect(() => {
    if (user?.id) loadFamilyData();
  }, [user?.id]);

  const loadFamilyData = async () => {
    try {
      const { data: memberships } = await supabase
        .from("family_members")
        .select("family_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .limit(1);

      if (!memberships?.length) return;
      const fid = memberships[0].family_id;
      setFamilyId(fid);

      const { data: members } = await supabase
        .from("family_members")
        .select("user_id, display_name, full_name")
        .eq("family_id", fid)
        .eq("is_active", true);

      if (members) {
        const map = new Map<string, string>();
        const list: FamilyMember[] = [];
        members.forEach(m => {
          if (m.user_id) {
            const name = m.display_name || m.full_name || "Family Member";
            map.set(m.user_id, name);
            if (m.user_id !== user!.id) list.push({ user_id: m.user_id, name });
          }
        });
        setMemberMap(map);
        setFamilyMembers(list);
      }
    } catch (err) { logError("loadFamilyData:", err); }
  };

  // ── Unread counts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) loadUnreadCounts();
  }, [user?.id]);

  const loadUnreadCounts = async () => {
    const { data } = await supabase
      .from("direct_messages")
      .select("sender_id")
      .eq("recipient_id", user!.id)
      .is("read_at", null);
    const counts: Record<string, number> = {};
    data?.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
    setUnreadCounts(counts);
  };

  // ── Family chat ────────────────────────────────────────────────────────
  useEffect(() => {
    if (familyId) {
      loadFamilyMessages();
      const channel = supabase
        .channel(`family-${familyId}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "family_messages",
          filter: `family_id=eq.${familyId}`,
        }, (payload) => {
          const msg = payload.new as FamilyMessage;
          setFamilyMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user!.id) {
            const name = memberMap.get(msg.sender_id) || "Family member";
            showNotif(name, msg.content || "");
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [familyId, memberMap]);

  useEffect(() => {
    familyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [familyMessages]);

  const loadFamilyMessages = async () => {
    const { data } = await (supabase as any)
      .from("family_messages")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true })
      .limit(100);
    setFamilyMessages(data || []);
  };

  const sendFamilyMessage = async (content: string, mediaUrl?: string) => {
    if (!familyId || (!content.trim() && !mediaUrl)) return;
    setSending(true);
    const text = content.trim() || null;
    setNewMessage("");
    try {
      const { error } = await (supabase as any)
        .from("family_messages")
        .insert({ family_id: familyId, sender_id: user!.id, content: text, media_url: mediaUrl ?? null });
      if (error) throw error;
      haptic("success");
    } catch (err) {
      logError("sendFamilyMessage:", err);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
      if (!mediaUrl) setNewMessage(content);
    } finally { setSending(false); }
  };

  // ── Direct messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedMember) return;
    loadMessages(selectedMember.user_id);
    markMessagesRead(selectedMember.user_id);

    const channel = supabase
      .channel(`dm-${user!.id}-${selectedMember.user_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "direct_messages",
        filter: `recipient_id=eq.${user!.id}`,
      }, (payload) => {
        const msg = payload.new as DirectMessage;
        if (msg.sender_id === selectedMember.user_id) {
          setMessages(prev => [...prev, msg]);
          markMessagesRead(selectedMember.user_id);
          showNotif(selectedMember.name, msg.content || "");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedMember?.user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (otherUserId: string) => {
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user!.id})`)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data || []) as DirectMessage[]);
  };

  const markMessagesRead = async (otherUserId: string) => {
    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() } as any)
      .eq("recipient_id", user!.id)
      .eq("sender_id", otherUserId)
      .is("read_at", null);
    setUnreadCounts(prev => ({ ...prev, [otherUserId]: 0 }));
  };

  const sendDirectMessage = async (content: string, mediaUrl?: string) => {
    if (!selectedMember || (!content.trim() && !mediaUrl)) return;
    haptic("light");
    setSending(true);
    const text = content.trim() || null;
    setNewMessage("");
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({ sender_id: user!.id, recipient_id: selectedMember.user_id, content: text, media_url: mediaUrl ?? null } as any)
        .select()
        .single();
      if (error) throw error;
      if (data) { haptic("success"); setMessages(prev => [...prev, data as DirectMessage]); }
    } catch (err) {
      logError("sendDirectMessage:", err);
      toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
      if (!mediaUrl) setNewMessage(content);
    } finally { setSending(false); }
  };

  // ── Media upload ───────────────────────────────────────────────────────
  const handleImageUpload = async (file: File, type: "direct" | "family") => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Images only", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Maximum size is 5 MB.", variant: "destructive" });
      return;
    }
    setUploadingMedia(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const publicUrl = await compressAndUpload(file, "message-media", path);
      if (type === "direct") await sendDirectMessage(newMessage, publicUrl);
      else await sendFamilyMessage(newMessage, publicUrl);
    } catch (err) {
      logError("handleImageUpload:", err);
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally { setUploadingMedia(false); }
  };

  // ── Shared send handler ────────────────────────────────────────────────
  const handleSend = () => {
    if (activeTab === "family") sendFamilyMessage(newMessage);
    else sendDirectMessage(newMessage);
  };

  const canSend = !sending && !uploadingMedia && (
    activeTab === "family" ? !!familyId : !!selectedMember
  ) && newMessage.trim().length > 0;

  const filteredMembers = familyMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Message bubble ─────────────────────────────────────────────────────
  const MessageBubble = ({ msg, isOwn, senderName }: { msg: DirectMessage | FamilyMessage; isOwn: boolean; senderName?: string }) => (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {!isOwn && (
        <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
          <AvatarFallback className="text-xs bg-primary/10">{getInitials(senderName || "?")}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && senderName && (
          <span className="text-xs font-medium px-1" style={{ color: "hsl(var(--primary))" }}>{senderName}</span>
        )}
        <div className={`rounded-2xl overflow-hidden ${isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
          {msg.media_url && (
            <img
              src={msg.media_url}
              alt="Shared image"
              className="max-w-[240px] max-h-[240px] w-full object-cover cursor-pointer"
              onClick={() => setLightboxUrl(msg.media_url!)}
            />
          )}
          {msg.content && (
            <p className="text-sm px-3 py-2 whitespace-pre-wrap break-words">{msg.content}</p>
          )}
        </div>
        <span className="text-xs text-muted-foreground px-1">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );

  // ── Message input bar ──────────────────────────────────────────────────
  const InputBar = ({ type }: { type: "direct" | "family" }) => (
    <div className="flex gap-2 pt-3 border-t flex-shrink-0">
      <input
        ref={type === "direct" ? directFileRef : familyFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, type); e.target.value = ""; }}
      />
      <Button
        variant="outline"
        size="icon"
        className="flex-shrink-0"
        disabled={uploadingMedia || sending}
        onClick={() => (type === "direct" ? directFileRef : familyFileRef).current?.click()}
        title="Share image"
      >
        {uploadingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
      </Button>
      <Input
        placeholder="Type a message..."
        value={newMessage}
        onChange={e => setNewMessage(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
        maxLength={2000}
        className="flex-1"
        disabled={sending || uploadingMedia}
      />
      <Button
        onClick={handleSend}
        disabled={!canSend}
        size="icon"
        className="gradient-primary text-white border-0 flex-shrink-0"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
        <h1 className="text-lg sm:text-2xl font-bold">Messages</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "family" | "direct")} className="flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: "400px" }}>
        <TabsList className="w-full sm:w-auto flex-shrink-0">
          <TabsTrigger value="family" className="flex-1 sm:flex-none gap-2">
            <Users className="w-4 h-4" />
            Family Chat
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex-1 sm:flex-none gap-2">
            <MessageCircle className="w-4 h-4" />
            Direct
            {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Family Chat ── */}
        <TabsContent value="family" className="flex-1 mt-4 min-h-0">
        <div className="flex flex-col h-full">
        {true && (
          <div className="flex flex-col h-full">
            {familyId ? (
              <>
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {familyMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    familyMessages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.sender_id === user?.id}
                        senderName={memberMap.get(msg.sender_id) || "Family member"}
                      />
                    ))
                  )}
                  <div ref={familyEndRef} />
                </div>
                <InputBar type="family" />
              </>
            ) : (
              <Card className="flex-1">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Join a family to see the group chat</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        </div>
        </TabsContent>

        {/* ── Direct Messages ── */}
        <TabsContent value="direct" className="flex-1 mt-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 h-full">

            {/* Contact list */}
            <div className={`${selectedMember ? "hidden md:flex" : "flex"} flex-col gap-2 md:col-span-1`}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search family..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map(member => (
                    <button
                      key={member.user_id}
                      onClick={() => setSelectedMember(member)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedMember?.user_id === member.user_id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">Family member</p>
                      </div>
                      {(unreadCounts[member.user_id] || 0) > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs flex-shrink-0">
                          {unreadCounts[member.user_id]}
                        </Badge>
                      )}
                    </button>
                  ))
                ) : familyMembers.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Join a family to start messaging</p>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No results</p>
                )}
              </div>
            </div>

            {/* Chat thread */}
            {selectedMember ? (
              <div className="flex flex-col md:col-span-2 min-h-0 h-full">
                <div className="flex items-center gap-3 pb-3 border-b flex-shrink-0">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedMember(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                      {getInitials(selectedMember.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">Family member</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto py-3 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet. Say hi!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.sender_id === user?.id}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <InputBar type="direct" />
              </div>
            ) : (
              <div className="hidden md:flex md:col-span-2 items-center justify-center">
                <Card className="w-full">
                  <CardContent className="flex flex-col items-center justify-center p-12">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mb-6" />
                    <p className="text-sm text-muted-foreground text-center">
                      Select a family member to start a conversation
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </Button>
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Full size" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messaging;
