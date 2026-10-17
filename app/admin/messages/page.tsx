"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Paperclip,
  X,
  Loader2,
  User,
  MapPin,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Filter,
  Check,
  CheckCheck,
  Building2,
  Tag,
  ImageIcon,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  messagingService,
  type ChatMessage,
  type FarmerConversation,
  type ChatAttachment,
} from "@/lib/services/messagingService";
import {
  AttachmentPreviewModal,
  AttachmentBubbleCard,
} from "@/components/messaging/attachment-preview-modal";

const DEPARTMENTS = [
  "General Support",
  "Payouts & Settlements",
  "Accreditation & KYC",
  "Orders & Logistics",
  "Platform Operations",
];

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [departmentTag, setDepartmentTag] = useState("General Support");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isFarmerTyping, setIsFarmerTyping] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Query all farmer conversations
  const {
    data: conversations = [],
    isLoading: isConversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["admin-farmer-conversations", searchQuery],
    queryFn: () => messagingService.getAllConversations(searchQuery),
    refetchInterval: 10000,
  });

  // Automatically select the first farmer if none selected
  useEffect(() => {
    if (!selectedFarmerId && conversations.length > 0) {
      setSelectedFarmerId(conversations[0].farmerId);
    }
  }, [conversations, selectedFarmerId]);

  const selectedConversation = useMemo(() => {
    if (!selectedFarmerId) return conversations[0] || null;
    return conversations.find((c) => c.farmerId === selectedFarmerId) || conversations[0] || null;
  }, [conversations, selectedFarmerId]);

  // 2. Query active message thread
  const {
    data: threadData,
    isLoading: isThreadLoading,
  } = useQuery({
    enabled: !!selectedFarmerId,
    queryKey: ["farmer-admin-thread", selectedFarmerId],
    queryFn: () => messagingService.getThread(selectedFarmerId || undefined),
    refetchInterval: 10000,
  });

  const messages = threadData?.messages || [];

  // 3. Mark messages as read by Admin when active thread opens & hook real-time listeners
  useEffect(() => {
    if (!selectedFarmerId) return;

    // Mark as read by admin
    messagingService.markAsRead(selectedFarmerId, "admin");
    qc.invalidateQueries({ queryKey: ["admin-unread-messages"] });

    // Supabase Realtime channel for global admin messages
    const channel = supabase
      .channel("admin-messages-live-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_admin_messages",
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["admin-farmer-conversations"] });
          qc.invalidateQueries({ queryKey: ["farmer-admin-thread", selectedFarmerId] });
          qc.invalidateQueries({ queryKey: ["admin-unread-messages"] });

          if (payload.eventType === "INSERT" && payload.new?.sender_type === "farmer") {
            if (payload.new.farmer_id === selectedFarmerId) {
              messagingService.markAsRead(selectedFarmerId, "admin");
            } else {
              toast.info(`💬 New message from ${payload.new.sender_name || "a farmer"}`);
            }
          }
        }
      )
      .subscribe();

    // BroadcastChannel listener
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("prajnaa-messages-sync");
      bc.onmessage = (event) => {
        if (event.data?.eventType === "typing" && event.data?.farmerId === selectedFarmerId) {
          if (event.data?.data?.senderType === "farmer") {
            setIsFarmerTyping(true);
            setTimeout(() => setIsFarmerTyping(false), 3000);
          }
        }
        qc.invalidateQueries({ queryKey: ["admin-farmer-conversations"] });
        qc.invalidateQueries({ queryKey: ["farmer-admin-thread", selectedFarmerId] });
        qc.invalidateQueries({ queryKey: ["admin-unread-messages"] });
      };
    } catch {
      // ignore
    }

    return () => {
      supabase.removeChannel(channel);
      bc?.close();
    };
  }, [selectedFarmerId, qc]);

  // Scroll helpers & state updater
  const updateScrollState = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    const isScrollable = el.scrollHeight > el.clientHeight + 10;
    const isNearTop = el.scrollTop <= 20;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 30;

    setCanScrollUp(isScrollable && !isNearTop);
    setCanScrollDown(isScrollable && !isNearBottom);
  };

  const scrollToTop = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  };

  const scrollUpStep = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollBy({ top: -280, behavior: "smooth" });
    }
  };

  const scrollDownStep = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollBy({ top: 280, behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom(true);
    const timer = setTimeout(updateScrollState, 150);
    return () => clearTimeout(timer);
  }, [messages, isFarmerTyping]);

  // Send admin reply
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFarmerId || (!replyText.trim() && attachments.length === 0) || isSending) return;

    const textToSend = replyText.trim();
    const tagToSend = departmentTag;
    const attachmentsToSend = [...attachments];

    setReplyText("");
    setAttachments([]);
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await messagingService.sendMessage({
        farmerId: selectedFarmerId,
        senderType: "admin",
        senderId: user?.id || "admin_portal",
        senderName: "Prajnaa Admin",
        text: textToSend,
        departmentTag: tagToSend,
        attachments: attachmentsToSend,
      });

      qc.invalidateQueries({ queryKey: ["farmer-admin-thread", selectedFarmerId] });
      qc.invalidateQueries({ queryKey: ["admin-farmer-conversations"] });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB. Please choose a smaller file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const newAttachment = await messagingService.uploadAttachment(file);
      setAttachments((prev) => [...prev, newAttachment]);
      toast.success(`Attached "${file.name}"`);
    } catch {
      toast.error("Failed to process file attachment.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredConversations = useMemo(() => {
    if (!filterUnreadOnly) return conversations;
    return conversations.filter((c) => c.unreadByAdmin > 0);
  }, [conversations, filterUnreadOnly]);

  // Group messages by readable date
  const groupedMessages = useMemo(() => {
    const groups: { dateLabel: string; items: ChatMessage[] }[] = [];
    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateLabel = msgDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
      if (msgDate.toDateString() === today.toDateString()) {
        dateLabel = "Today";
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        dateLabel = "Yesterday";
      }

      const existingGroup = groups.find((g) => g.dateLabel === dateLabel);
      if (existingGroup) {
        existingGroup.items.push(msg);
      } else {
        groups.push({ dateLabel, items: [msg] });
      }
    });
    return groups;
  }, [messages]);

  return (
    <div className="space-y-3 max-w-7xl mx-auto flex flex-col h-[calc(100dvh-10rem)] min-h-[520px] max-h-[calc(100dvh-9.5rem)] overflow-hidden pb-1">
      {/* Page Title & Subtitle */}
      <div className="shrink-0">
        <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Farmer Inquiries & Support
        </h2>
        <p className="font-subhead text-xs text-muted-foreground mt-0.5">
          Direct real-time communication channel with registered farmers.
        </p>
      </div>

      {/* Main 2-Panel Card Shell */}
      <div className="flex-1 min-h-0 rounded-3xl border border-border/70 bg-white shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* ======================================================================= */}
        {/* LEFT PANEL: CONVERSATION LIST                                           */}
        {/* ======================================================================= */}
        <div className="lg:col-span-4 border-r border-border/70 flex flex-col h-full min-h-0 overflow-hidden bg-[#FAF9F6]/50">
          {/* Search & Filter Bar */}
          <div className="p-3 sm:p-3.5 border-b border-border/70 bg-white space-y-2 shrink-0">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search farmers, farms, villages..."
                className="w-full rounded-2xl border border-border/80 bg-secondary/30 pl-9 pr-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0F3D2E]"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {filteredConversations.length} Farmer{filteredConversations.length === 1 ? "" : "s"}
              </span>

              <button
                type="button"
                onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
                className={`font-subhead text-[11px] px-2.5 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                  filterUnreadOnly
                    ? "bg-[#0F3D2E]/15 text-[#0F3D2E] border-[#0F3D2E]/40 font-bold ring-1 ring-[#0F3D2E]/25 shadow-2xs"
                    : "bg-white text-muted-foreground border-border/80 hover:bg-secondary/60 hover:text-foreground font-medium"
                }`}
              >
                <Filter className="h-3 w-3" />
                <span>Unread Only</span>
              </button>
            </div>
          </div>

          {/* Conversation List Items */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-border/60 overscroll-contain">
            {isConversationsLoading ? (
              <div className="py-16 grid place-items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">No conversations found</p>
                <p>Try searching for another farmer name or clear filter.</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.farmerId === selectedFarmerId;
                const timeFormatted = new Date(conv.lastMessageAt).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setSelectedFarmerId(conv.farmerId);
                      qc.invalidateQueries({ queryKey: ["farmer-admin-thread", conv.farmerId] });
                    }}
                    className={`w-full text-left p-3 sm:p-3.5 transition-all flex items-start gap-3 relative hover:bg-secondary/40 cursor-pointer ${
                      isSelected ? "bg-[#0F3D2E]/[0.08] border-l-4 border-[#0F3D2E]" : ""
                    }`}
                  >
                    {/* Avatar with status */}
                    <div className="relative shrink-0">
                      <div className="h-10 w-10 rounded-full bg-[#0F3D2E] text-white font-bold text-xs grid place-items-center shadow-2xs">
                        {conv.farmerName.slice(0, 2).toUpperCase()}
                      </div>
                      {conv.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-display font-bold text-xs text-foreground truncate">
                          {conv.farmerName}
                        </h4>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {timeFormatted}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate mb-1">
                        {conv.farmName} · {conv.village}
                      </p>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground/90 truncate flex-1">
                          {conv.lastMessageSender === "admin" ? (
                            <span className="font-semibold text-foreground/80">You: </span>
                          ) : null}
                          {conv.lastMessageText}
                        </p>

                        {conv.unreadByAdmin > 0 && (
                          <span className="h-4 min-w-[16px] px-1.5 rounded-full bg-[#0F3D2E] text-white text-[10px] font-bold grid place-items-center shrink-0 shadow-2xs">
                            {conv.unreadByAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: ACTIVE CONVERSATION THREAD                                 */}
        {/* ======================================================================= */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden bg-white">
          {selectedConversation ? (
            <>
              {/* Context Header */}
              <div className="p-3 sm:p-4 border-b border-border/70 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-[#0F3D2E] text-white font-bold text-sm grid place-items-center shadow-xs">
                      {selectedConversation.farmerName.slice(0, 2).toUpperCase()}
                    </div>
                    {selectedConversation.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                        {selectedConversation.farmerName}
                      </h3>
                      {selectedConversation.isVerified ? (
                        <span className="font-subhead text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Verified Farmer
                        </span>
                      ) : (
                        <span className="font-subhead text-[10px] sm:text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          Verification Pending
                        </span>
                      )}
                    </div>
                    <p className="font-subhead text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{selectedConversation.farmName}</span>
                      <span>•</span>
                      <span>{selectedConversation.village}, {selectedConversation.state}</span>
                      {selectedConversation.phone && (
                        <>
                          <span>•</span>
                          <span>{selectedConversation.phone}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {/* Quick Scroll Up/Down Header Pill */}
                  <div className="flex items-center bg-[#0F3D2E]/[0.06] border border-[#0F3D2E]/15 rounded-full p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={scrollUpStep}
                      className="h-7 px-2.5 rounded-full text-xs font-semibold text-[#0F3D2E] hover:bg-white flex items-center gap-1 transition-all cursor-pointer"
                      title="Scroll upward (Move up)"
                      aria-label="Scroll upward"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline font-subhead text-[11px]">Up</span>
                    </button>
                    <div className="w-px h-3.5 bg-[#0F3D2E]/20" />
                    <button
                      type="button"
                      onClick={scrollDownStep}
                      className="h-7 px-2.5 rounded-full text-xs font-semibold text-[#0F3D2E] hover:bg-white flex items-center gap-1 transition-all cursor-pointer"
                      title="Scroll downward (Move down)"
                      aria-label="Scroll downward"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline font-subhead text-[11px]">Down</span>
                    </button>
                  </div>

                  <Link
                    href={`/admin/vendors?search=${encodeURIComponent(selectedConversation.farmerName)}`}
                    className="font-subhead inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/80 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <span>Vendor Profile</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </div>
              </div>

              {/* Messages Stream Area (Scrollable with custom scroll track & floating scroll controls) */}
              <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col">
                <div
                  ref={chatContainerRef}
                  onScroll={updateScrollState}
                  tabIndex={0}
                  className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 bg-[#FAF9F6]/50 overscroll-contain focus:outline-hidden"
                >
                  {isThreadLoading ? (
                    <div className="h-full grid place-items-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-[#0F3D2E]" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full grid place-items-center text-center p-6 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">No prior messages with this farmer.</p>
                      <p>Send a message below to initiate communication.</p>
                    </div>
                  ) : (
                    groupedMessages.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-4">
                        {/* Day Separator Pill */}
                        <div className="flex items-center justify-center my-2">
                          <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-[#6B6355] bg-[#EFECE6] px-3.5 py-1 rounded-full select-none">
                            {group.dateLabel}
                          </span>
                        </div>

                        {/* Bubbles in this group */}
                        {group.items.map((msg) => {
                          const isAdmin = msg.senderType === "admin";
                          const timeFormatted = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          if (isAdmin) {
                            /* OUTGOING (Admin reply) */
                            return (
                              <div key={msg.id} className="flex flex-col items-end">
                                <div className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tr-xs bg-[#0F3D2E] text-white px-4 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13.5px] leading-relaxed shadow-xs space-y-2">
                                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                                  {/* Attachments */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="pt-1.5 space-y-1.5 border-t border-white/20">
                                      {msg.attachments.map((att, attIdx) => (
                                        <AttachmentBubbleCard
                                          key={attIdx}
                                          attachment={att}
                                          isOutgoing={true}
                                          onPreview={(a) => setPreviewAttachment(a)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Timestamp & Read Receipts */}
                                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-white/80 pt-0.5 select-none">
                                    <span>{timeFormatted}</span>
                                    <span title={msg.readAt ? "Seen by Farmer" : "Delivered"}>
                                      {msg.readAt ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-emerald-300" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 text-white/50" />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          /* INCOMING (Farmer's message) */
                          return (
                            <div key={msg.id} className="flex flex-col items-start space-y-1">
                              {/* Sender label & department tag */}
                              <div className="flex items-center gap-1.5 pl-9 text-[11px] text-muted-foreground font-medium">
                                <span className="text-foreground font-semibold">{selectedConversation.farmerName}</span>
                                {msg.departmentTag && (
                                  <span className="font-subhead text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E]">
                                    {msg.departmentTag}
                                  </span>
                                )}
                              </div>

                              {/* Avatar + Bubble container */}
                              <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[75%]">
                                {/* Small Farmer Avatar */}
                                <div className="h-7 w-7 rounded-full bg-[#0F3D2E]/15 text-[#0F3D2E] font-bold text-xs grid place-items-center shrink-0 shadow-xs mb-0.5">
                                  {selectedConversation.farmerName.slice(0, 2).toUpperCase()}
                                </div>

                                {/* Bubble Body */}
                                <div className="flex-1 rounded-2xl rounded-tl-xs bg-[#FAF8F5] border border-[#E9E5DC] text-foreground px-4 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13.5px] leading-relaxed shadow-2xs space-y-2">
                                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                                  {/* Attachments */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="pt-1.5 space-y-1.5 border-t border-border/60">
                                      {msg.attachments.map((att, attIdx) => (
                                        <AttachmentBubbleCard
                                          key={attIdx}
                                          attachment={att}
                                          isOutgoing={false}
                                          onPreview={(a) => setPreviewAttachment(a)}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Timestamp */}
                                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground pt-0.5 select-none">
                                    <span>{timeFormatted}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}

                  {/* Typing indicator */}
                  {isFarmerTyping && (
                    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="h-7 w-7 rounded-full bg-[#0F3D2E]/15 text-[#0F3D2E] font-bold text-xs grid place-items-center shrink-0 shadow-xs mb-0.5">
                        {selectedConversation.farmerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="rounded-2xl rounded-tl-xs bg-[#FAF8F5] border border-[#E9E5DC] px-4 py-3 shadow-2xs">
                        <div className="flex items-center gap-1.5 h-4">
                          <span className="h-2 w-2 rounded-full bg-[#0F3D2E]/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full bg-[#0F3D2E]/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-[#0F3D2E]/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Floating Navigation Controls (Upward / Downward / Jump to Latest) */}
                <div className="absolute bottom-3 right-4 z-20 flex flex-col gap-1.5 animate-in fade-in zoom-in-75 duration-150">
                  {canScrollUp && (
                    <button
                      type="button"
                      onClick={scrollUpStep}
                      className="h-8 w-8 rounded-full bg-white/95 text-[#0F3D2E] border border-border/90 shadow-md hover:bg-[#FAF9F6] hover:scale-105 active:scale-95 transition-all grid place-items-center cursor-pointer backdrop-blur-sm"
                      title="Scroll upward"
                      aria-label="Scroll upward"
                    >
                      <ChevronUp className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}

                  {canScrollDown && (
                    <button
                      type="button"
                      onClick={() => scrollToBottom(true)}
                      className="h-8 w-8 rounded-full bg-[#0F3D2E] text-white shadow-md hover:bg-[#154d3b] hover:scale-105 active:scale-95 transition-all grid place-items-center cursor-pointer"
                      title="Scroll downward to latest"
                      aria-label="Scroll downward"
                    >
                      <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Composer at bottom */}
              <div className="p-3 sm:p-3.5 border-t border-border/70 bg-white space-y-2 shrink-0">
                {/* Department Tag Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Send As Department:
                  </span>
                  <select
                    value={departmentTag}
                    onChange={(e) => setDepartmentTag(e.target.value)}
                    className="font-subhead text-[11px] font-semibold bg-[#0F3D2E]/10 border border-[#0F3D2E]/20 rounded-xl px-2.5 py-0.5 text-[#0F3D2E] focus:outline-hidden focus:ring-1 focus:ring-[#0F3D2E]"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staged Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewAttachment(att)}
                        className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-xl text-xs border border-border text-foreground cursor-pointer transition-colors"
                        title="Click to preview staged attachment"
                      >
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[140px]">{att.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttachments((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-full cursor-pointer ml-1"
                          title="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Textarea & Send Input Form */}
                <form onSubmit={handleSendReply} className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 rounded-2xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors grid place-items-center shrink-0 cursor-pointer"
                    title="Attach file"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Reply to ${selectedConversation.farmerName}... (Enter to send, Shift+Enter for new line)`}
                    rows={1}
                    className="flex-1 max-h-28 min-h-[38px] resize-none rounded-2xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0F3D2E]"
                  />

                  <button
                    type="submit"
                    disabled={(!replyText.trim() && attachments.length === 0) || isSending}
                    className="h-9 px-4 rounded-2xl bg-[#0F3D2E] text-white hover:bg-[#154d3b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Reply</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full grid place-items-center text-center p-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-2 mx-auto" />
              <p className="font-semibold text-sm text-foreground">Select a farmer conversation</p>
              <p className="text-xs">Choose a conversation from the left to read and send replies.</p>
            </div>
          )}
        </div>
      </div>

      {/* Attachment Full Preview Modal */}
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
