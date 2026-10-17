"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Send,
  ShieldCheck,
  CheckCircle2,
  Paperclip,
  X,
  Loader2,
  HelpCircle,
  IndianRupee,
  Award,
  Package,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFarmerProfile } from "@/lib/farmer/use-farmer";
import {
  messagingService,
  type ChatMessage,
  type ChatAttachment,
} from "@/lib/services/messagingService";
import {
  AttachmentPreviewModal,
  AttachmentBubbleCard,
} from "@/components/messaging/attachment-preview-modal";

const PROMPT_STARTERS = [
  { label: "Payout & Settlement Inquiry", tag: "Payouts", icon: IndianRupee },
  { label: "Accreditation & Certificate Status", tag: "Accreditation", icon: Award },
  { label: "Produce Packaging & Fulfillment", tag: "Logistics", icon: Package },
  { label: "General Farm Account Support", tag: "General Support", icon: HelpCircle },
];

export default function FarmerMessagesPage() {
  const { data: farmer, isLoading: isProfileLoading } = useFarmerProfile();
  const qc = useQueryClient();

  const farmerId = farmer?.id || undefined;
  const farmerName = farmer?.full_name || "Farmer";

  const [messageText, setMessageText] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<ChatAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Fetch message thread strictly for this farmer
  const {
    data: threadData,
    isLoading: isThreadLoading,
    refetch,
  } = useQuery({
    enabled: !!farmerId,
    queryKey: ["farmer-admin-thread", farmerId],
    queryFn: () => messagingService.getThread(farmerId),
    refetchInterval: 10000,
  });

  const messages = threadData?.messages || [];

  // 2. Mark messages as read on view & hook real-time listeners
  useEffect(() => {
    if (!farmerId) return;

    // Mark unread admin messages as read
    messagingService.markAsRead(farmerId, "farmer");
    qc.invalidateQueries({ queryKey: ["farmer-unread-messages"] });

    // Supabase Realtime channel
    const channel = supabase
      .channel(`farmer-thread-${farmerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmer_admin_messages",
          filter: `farmer_id=eq.${farmerId}`,
        },
        (payload: any) => {
          qc.invalidateQueries({ queryKey: ["farmer-admin-thread", farmerId] });
          qc.invalidateQueries({ queryKey: ["farmer-unread-messages"] });

          if (payload.eventType === "INSERT" && payload.new?.sender_type === "admin") {
            toast.info(`💬 New message from Prajnaa Admin: "${payload.new.text?.slice(0, 45)}..."`);
            messagingService.markAsRead(farmerId, "farmer");
          }
        }
      )
      .subscribe();

    // BroadcastChannel for cross-tab instant messaging
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("prajnaa-messages-sync");
      bc.onmessage = (event) => {
        if (event.data?.farmerId === farmerId) {
          if (event.data?.eventType === "message" || event.data?.eventType === "read") {
            qc.invalidateQueries({ queryKey: ["farmer-admin-thread", farmerId] });
            qc.invalidateQueries({ queryKey: ["farmer-unread-messages"] });
          } else if (event.data?.eventType === "typing") {
            if (event.data?.data?.senderType === "admin") {
              setIsAdminTyping(true);
              setTimeout(() => setIsAdminTyping(false), 3000);
            }
          }
        }
      };
    } catch {
      // ignore
    }

    return () => {
      supabase.removeChannel(channel);
      bc?.close();
    };
  }, [farmerId, qc]);

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
  }, [messages, isAdminTyping]);

  // Handle message sending
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!farmerId || (!messageText.trim() && attachments.length === 0) || isSending) return;

    const textToSend = messageText.trim();
    const tagToSend = selectedTag;
    const attachmentsToSend = [...attachments];

    // Optimistic UI reset
    setMessageText("");
    setAttachments([]);
    setSelectedTag(null);
    setIsSending(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      await messagingService.sendMessage({
        farmerId,
        senderType: "farmer",
        senderId: farmerId,
        senderName: farmerName,
        text: textToSend,
        departmentTag: tagToSend,
        attachments: attachmentsToSend,
      });

      qc.invalidateQueries({ queryKey: ["farmer-admin-thread", farmerId] });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file attachment upload with Base64 encoding for persistence
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

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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
    <div className="max-w-5xl mx-auto space-y-3 pb-1 flex flex-col h-[calc(100dvh-10rem)] min-h-[520px] max-h-[calc(100dvh-9.5rem)] overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. CHAT HEADER ROW                                                        */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-border/70 bg-white p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar (Shield icon on forest green circle) */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-[#0F3D2E] text-white grid place-items-center shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            {/* Online Indicator */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-foreground">
                Prajnaa Admin
              </h2>
              <span className="font-subhead text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Verified
              </span>
            </div>
            <p className="font-subhead text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Usually replies within a few hours
            </p>
          </div>
        </div>

        {/* Quick Action / Fallback escalation path & Scroll Controls */}
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

          <a
            href="/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="font-subhead inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary border border-border/80 px-3.5 py-1.5 rounded-full transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Contact Support</span>
          </a>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN CHAT CONTAINER                                                    */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 rounded-3xl border border-border/70 bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Messages Scroll Area */}
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
              /* ================================================================= */
              /* 6. EMPTY STATE                                                    */
              /* ================================================================= */
              <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
                <div className="h-13 w-13 rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E] grid place-items-center shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                    No messages yet
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Message the Prajnaa team anytime — we&apos;re here to help with onboarding, payouts, accreditation, or anything else.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => textareaRef.current?.focus()}
                  className="font-subhead inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F3D2E] text-white hover:bg-[#154d3b] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Start a conversation</span>
                </button>

                {/* Starter Prompt Chips */}
                <div className="pt-2 w-full grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {PROMPT_STARTERS.map((starter, i) => {
                    const Icon = starter.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSelectedTag(starter.tag);
                          setMessageText(`Hello Prajnaa Team, I have an inquiry regarding ${starter.label.toLowerCase()}.`);
                          textareaRef.current?.focus();
                        }}
                        className="p-3 rounded-2xl border border-border/80 bg-white hover:bg-secondary/60 transition-all text-xs flex items-center gap-2.5 text-foreground hover:border-[#0F3D2E]/40 group cursor-pointer shadow-2xs"
                      >
                        <div className="h-7 w-7 rounded-xl bg-secondary text-muted-foreground group-hover:bg-[#0F3D2E]/10 group-hover:text-[#0F3D2E] grid place-items-center shrink-0 transition-colors">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium truncate">{starter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ================================================================= */
              /* MESSAGE STREAM                                                    */
              /* ================================================================= */
              groupedMessages.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  {/* 3. DAY SEPARATOR (Soft light tan/cream filled pill) */}
                  <div className="flex items-center justify-center my-2">
                    <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-[#6B6355] bg-[#EFECE6] px-3.5 py-1 rounded-full select-none">
                      {group.dateLabel}
                    </span>
                  </div>

                  {/* Bubbles in this date group */}
                  {group.items.map((msg) => {
                    const isFarmer = msg.senderType === "farmer";
                    const timeFormatted = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    if (isFarmer) {
                      /* OUTGOING BUBBLE (Farmer's Own Message) */
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
                              <span title={msg.readAt ? "Seen by Admin" : "Sent"}>
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

                    /* INCOMING BUBBLE (Admin's Reply) */
                    return (
                      <div key={msg.id} className="flex flex-col items-start space-y-1">
                        {/* Sender label & department tag */}
                        <div className="flex items-center gap-1.5 pl-9 text-[11px] text-muted-foreground font-medium">
                          <span className="text-foreground font-semibold">Prajnaa Admin</span>
                          {msg.departmentTag && (
                            <span className="font-subhead text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0F3D2E]/10 text-[#0F3D2E]">
                              {msg.departmentTag}
                            </span>
                          )}
                        </div>

                        {/* Avatar + Bubble container */}
                        <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[75%]">
                          {/* Small Admin Avatar */}
                          <div className="h-7 w-7 rounded-full bg-[#0F3D2E] text-white grid place-items-center shrink-0 shadow-xs mb-0.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </div>

                          {/* Bubble Body */}
                          <div className="flex-1 rounded-2xl rounded-tl-xs bg-[#FAF8F5] border border-[#E9E5DC] text-foreground px-4 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-[13.5px] leading-relaxed shadow-2xs space-y-2">
                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                            {/* Attachments preview */}
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

            {/* 5. TYPING INDICATOR */}
            {isAdminTyping && (
              <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="h-7 w-7 rounded-full bg-[#0F3D2E] text-white grid place-items-center shrink-0 shadow-xs mb-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
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

        {/* ======================================================================= */}
        {/* 3. COMPOSER AT BOTTOM                                                   */}
        {/* ======================================================================= */}
        <div className="p-3 sm:p-3.5 border-t border-border/70 bg-white space-y-2 shrink-0">
          {/* Tag Inquiry Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-subhead text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Tag Inquiry:
            </span>
            {["Payouts", "Accreditation", "Logistics", "General Support"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`font-subhead text-[11px] px-3 py-0.5 rounded-full border transition-all cursor-pointer ${
                  selectedTag === tag
                    ? "bg-[#0F3D2E]/15 text-[#0F3D2E] border-[#0F3D2E]/40 font-bold ring-1 ring-[#0F3D2E]/25 shadow-2xs"
                    : "bg-white text-muted-foreground border-border/80 hover:bg-secondary/60 hover:text-foreground font-medium"
                }`}
              >
                {tag}
              </button>
            ))}
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
                      removeAttachment(idx);
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
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
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
              title="Attach photo or document"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message to Prajnaa Admin... (Press Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 max-h-28 min-h-[38px] resize-none rounded-2xl border border-border/80 bg-secondary/30 px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-[#0F3D2E]"
            />

            <button
              type="submit"
              disabled={(!messageText.trim() && attachments.length === 0) || isSending}
              className="h-9 px-4 rounded-2xl bg-[#0F3D2E] text-white hover:bg-[#154d3b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-semibold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
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
