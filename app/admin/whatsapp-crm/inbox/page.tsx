"use client";

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Search,
  Send,
  Phone,
  User,
  MapPin,
  Clock,
  Package,
  QrCode,
  CheckCircle2,
  Truck,
  ExternalLink,
  ShieldCheck,
  Check,
  CheckCheck,
  Tag,
  FileText,
  AlertCircle,
  Copy,
  ChevronRight,
  Info,
  RefreshCw,
  TrendingUp,
  Paperclip,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  whatsappCrmService,
  WhatsAppConversation,
  WhatsAppMessage,
  PRAJNAA_WHATSAPP_CONFIG,
} from "@/lib/services/whatsappCrmService";
import { inr } from "@/lib/format";
import Link from "next/link";

export default function WhatsAppCrmInboxPage() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "pending_payment" | "packed">("all");
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedLightboxMedia, setSelectedLightboxMedia] = useState<{ url: string; type?: string; title?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || isSending) return;
    setIsSending(true);
    const toastId = toast.loading(`Uploading ${file.name} to WhatsApp...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("to", selectedConv.customerPhone);
      formData.append("customerId", selectedConv.id);
      formData.append("orderNumber", selectedConv.orderNumber || "");

      const res = await fetch("/api/crm/messages/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.messageRecord) {
        toast.success(`${file.name} sent to WhatsApp!`, { id: toastId });
        const newMsg: WhatsAppMessage = {
          id: data.messageRecord.id,
          conversationId: selectedConv.id,
          sender: "agent",
          text: data.messageRecord.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "sent",
          mediaId: data.messageRecord.mediaId,
          mediaUrl: data.messageRecord.mediaUrl,
          mediaType: data.messageRecord.type,
          filename: file.name,
        };
        setMessages((prev) => [...prev, newMsg]);
        setConversations(whatsappCrmService.getConversations());
      } else {
        toast.error(data.error || "Failed to send media", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Network error", { id: toastId });
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Load conversations on mount
  useEffect(() => {
    const data = whatsappCrmService.getConversations();
    setConversations(data);
    if (data.length > 0 && !selectedConvId) {
      setSelectedConvId(data[0].id);
    }
  }, [selectedConvId]);

  // Load messages whenever selected conversation changes
  useEffect(() => {
    if (selectedConvId) {
      const msgs = whatsappCrmService.getMessages(selectedConvId);
      setMessages(msgs);
    }
  }, [selectedConvId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Live polling for real-time WhatsApp updates
  useEffect(() => {
    let isMounted = true;
    const sync = async () => {
      const { newMessagesCount } = await whatsappCrmService.syncLiveMessages();
      if (newMessagesCount > 0 && isMounted) {
        setConversations(whatsappCrmService.getConversations());
        if (selectedConvId) {
          setMessages(whatsappCrmService.getMessages(selectedConvId));
        }
      }
    };
    void sync();
    const interval = setInterval(sync, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedConvId]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerPhone.includes(searchQuery) ||
      (c.orderNumber && c.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "unread") return c.unreadCount > 0;
    if (filterTab === "pending_payment") return c.status === "pending_payment";
    if (filterTab === "packed") return c.status === "packed";
    return true;
  });

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !selectedConv || isSending) return;
    setIsSending(true);

    const textToSend = inputMessage.trim();
    setInputMessage("");

    const newMsg = await whatsappCrmService.sendMessage(selectedConv.id, textToSend, "agent");
    setMessages((prev) => {
      const alreadyInState = prev.some(
        (m) => m.id === newMsg.id || (m.sender === "agent" && m.text.trim() === newMsg.text.trim())
      );
      return alreadyInState ? prev : [...prev, newMsg];
    });

    // Refresh conversation list to show updated last message
    setConversations(whatsappCrmService.getConversations());

    try {
      if ((newMsg as any).metaPending || (newMsg as any).metaStatus === "pending") {
        toast.success("Message recorded in CRM pipeline! (Meta status: Pending Review)");
      } else if (newMsg.status === "failed") {
        toast.error(`WhatsApp delivery note: ${(newMsg as any).error || "Meta rejected message"}`);
      } else {
        toast.success("WhatsApp message dispatched!");
      }
    } finally {
      setIsSending(false);
    }
  };

  // Quick action templates
  const sendQuickReply = async (type: "qr" | "confirm_payment" | "packing" | "tracking" | "delivered") => {
    if (!selectedConv || isSending) return;
    setIsSending(true);

    let text = "";
    if (type === "qr") {
      const amount = selectedConv.orderTotalPaise ? selectedConv.orderTotalPaise / 100 : 999;
      text = `Namaste ${selectedConv.customerName} ji! 🙏\n\nAapka Prajnaa Market order #${selectedConv.orderNumber} confirm karne ke liye ₹${amount.toLocaleString("en-IN")} transfer kar dijiye:\n\n• *UPI ID:* ${PRAJNAA_WHATSAPP_CONFIG.upiId}\n• *Bank:* ${PRAJNAA_WHATSAPP_CONFIG.bankDetails.bankName}\n• *A/C:* ${PRAJNAA_WHATSAPP_CONFIG.bankDetails.accountNumber}\n• *IFSC:* ${PRAJNAA_WHATSAPP_CONFIG.bankDetails.ifsc}\n\nPayment screenshot share karte hi packaging process start ho jayega. Dhanyavaad! 🌿`;
    } else if (type === "confirm_payment") {
      text = `Namaste ${selectedConv.customerName} ji! 🙏 Aapka ₹${((selectedConv.orderTotalPaise || 0) / 100).toLocaleString("en-IN")} ka payment receive ho gaya hai. Prajnaa Market mein order packaging mein aam taur par 2–3 din lagte hain kyunki hum direct mountain farmers se fresh batch sort karte hain. Packaging complete hote hi hum aapko update bhejenge!`;
    } else if (type === "packing") {
      text = `Namaste ${selectedConv.customerName} ji! 🙏 Aapke order #${selectedConv.orderNumber} ki packaging Shimla hub par complete ho gayi hai. Hum aapke parcel ko India Post Speed Post pickup ke liye schedule kar rahe hain.`;
    } else if (type === "tracking") {
      const tracking = selectedConv.consignmentNumber || "ED839102914IN";
      text = `Namaste ${selectedConv.customerName} ji! 📦 Aapka Prajnaa parcel dispatch ho chuka hai.\n\n• *Carrier:* India Post Speed Post\n• *Consignment ID:* ${tracking}\n\nAap is consignment number ko India Post ki official website par track kar sakte hain. Kripya apna phone available rakhein.`;
    } else if (type === "delivered") {
      text = `Namaste ${selectedConv.customerName} ji! 🙏 Aapke Prajnaa Market order ki delivery confirm ho gayi hai. Humein ummeed hai ki aapko hamare organic Himalayan products pasand aayenge. Prajnaa par bharosa karne ke liye dhanyavaad ji! 🌿`;
    }

    const newMsg = await whatsappCrmService.sendMessage(selectedConv.id, text, "agent");
    setMessages((prev) => {
      const alreadyInState = prev.some(
        (m) => m.id === newMsg.id || (m.sender === "agent" && m.text.trim() === newMsg.text.trim())
      );
      return alreadyInState ? prev : [...prev, newMsg];
    });
    setConversations(whatsappCrmService.getConversations());

    try {
      if ((newMsg as any).metaPending || (newMsg as any).metaStatus === "pending") {
        toast.success("Quick reply saved in CRM! (Meta status: Pending Review)");
      } else if (newMsg.status === "failed") {
        toast.error(`WhatsApp delivery note: ${(newMsg as any).error || "Meta rejected message"}`);
      } else {
        toast.success("WhatsApp message sent to customer");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedConv || isSending) return;
    setIsSending(true);
    const updated = conversations.map((c) =>
      c.id === selectedConv.id
        ? { ...c, orderPaymentStatus: "collected", status: "packed" as const }
        : c
    );
    setConversations(updated);
    whatsappCrmService.saveConversations(updated);
    toast.success(`Payment verified for order ${selectedConv.orderNumber}!`);

    // System audit message
    const sysMsg = await whatsappCrmService.sendMessage(
      selectedConv.id,
      `✅ Payment of ₹${((selectedConv.orderTotalPaise || 0) / 100).toLocaleString("en-IN")} verified by operator. Order moved to Packaging (2-3 working days).`,
      "agent"
    );
    setMessages((prev) => {
      const alreadyInState = prev.some(
        (m) => m.id === sysMsg.id || (m.sender === "agent" && m.text.trim() === sysMsg.text.trim())
      );
      return alreadyInState ? prev : [...prev, sysMsg];
    });
    setIsSending(false);
  };

  const copyTrackingToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
    toast.success("Tracking number copied to clipboard");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Top Banner Notice */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-emerald-950/10 px-6 py-2.5 text-xs text-foreground gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-900 dark:text-emerald-300">
            Official WABA: {PRAJNAA_WHATSAPP_CONFIG.businessNumber}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Meta Status: Pending Review
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Pipelines & CRM Core: Connected
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
          <span>Standard Packaging: 2–3 Days</span>
          <span className="hidden md:inline">· India Post Speed Post Integrated</span>
        </div>
      </div>

      {/* 3-Column WhatsApp CRM Layout */}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Column: Conversation Directory (3 cols) */}
        <div className="border-r border-border md:col-span-4 lg:col-span-3 flex flex-col bg-card/60">
          {/* Search & Tabs */}
          <div className="p-3 border-b border-border space-y-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, phone, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "pending_payment", label: "Payment Due" },
                { id: "packed", label: "Packing" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                    filterTab === tab.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConv?.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3.5 transition cursor-pointer hover:bg-secondary/60 ${
                    isSelected ? "bg-secondary border-l-4 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {conv.avatar ? (
                          <img src={conv.avatar} alt={conv.customerName} className="h-full w-full object-cover" />
                        ) : (
                          conv.customerName[0]
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{conv.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{conv.customerPhone}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{conv.lastMessageTime}</span>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 pl-10">
                    {conv.lastMessageText}
                  </p>

                  <div className="flex items-center justify-between gap-1 mt-2 pl-10">
                    {conv.orderNumber && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        #{conv.orderNumber}
                      </span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center ml-auto">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Live WhatsApp Thread (5 or 6 cols) */}
        <div className="md:col-span-5 lg:col-span-6 flex flex-col bg-background border-r border-border">
          {/* Thread Header */}
          {selectedConv && (
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-card/40">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                  {selectedConv.avatar ? (
                    <img src={selectedConv.avatar} alt={selectedConv.customerName} className="h-full w-full object-cover" />
                  ) : (
                    selectedConv.customerName[0]
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-sm text-foreground">{selectedConv.customerName}</h3>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{selectedConv.customerPhone}</span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">WhatsApp Customer</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  Agent: {selectedConv.assignedAgent || "Unassigned"}
                </span>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0F3D2E]/[0.02]">
            {messages.map((msg) => {
              const isAgent = msg.sender === "agent";
              const isSystem = msg.sender === "system";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="rounded-xl border border-border bg-card/80 px-3 py-1.5 text-center text-[11px] text-muted-foreground shadow-2xs max-w-md">
                      <span className="font-sans whitespace-pre-wrap">{msg.text}</span>
                      <div className="text-[9px] text-muted-foreground/70 mt-0.5">{msg.timestamp}</div>
                    </div>
                  </div>
                );
              }

              const isImage = msg.mediaType === "image" || (msg.mimeType && msg.mimeType.startsWith("image/"));
              const isVideo = msg.mediaType === "video" || (msg.mimeType && msg.mimeType.startsWith("video/"));
              const isAudio = msg.mediaType === "audio" || (msg.mimeType && msg.mimeType.startsWith("audio/"));
              const isDoc = msg.mediaType === "document" || (msg.mimeType && (msg.mimeType.includes("pdf") || msg.mimeType.includes("document") || msg.mimeType.includes("sheet") || msg.mimeType.includes("text")));
              const mediaSrc = msg.mediaUrl || (msg.mediaId ? `/api/whatsapp/media/${msg.mediaId}` : "");

              return (
                <div
                  key={msg.id}
                  className={`flex ${isAgent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl p-3 text-xs shadow-2xs space-y-1.5 ${
                      isAgent
                        ? "bg-[#0F3D2E] text-white rounded-br-xs"
                        : "bg-card border border-border text-foreground rounded-bl-xs"
                    }`}
                  >
                    {/* Image Attachment Preview */}
                    {isImage && mediaSrc && (
                      <div className="rounded-xl overflow-hidden mb-1 border border-black/10 dark:border-white/10 shadow-xs max-w-[280px]">
                        <img
                          src={mediaSrc}
                          alt={msg.text || "WhatsApp Image"}
                          className="w-full h-auto max-h-72 object-cover cursor-pointer hover:opacity-95 transition bg-neutral-900/5"
                          onClick={() => setSelectedLightboxMedia({ url: mediaSrc, type: "image", title: msg.text || "Photo" })}
                        />
                      </div>
                    )}

                    {/* Video Attachment Preview */}
                    {isVideo && mediaSrc && (
                      <div className="rounded-xl overflow-hidden mb-1 border border-black/10 dark:border-white/10 max-w-[280px]">
                        <video
                          src={mediaSrc}
                          controls
                          className="w-full h-auto max-h-72 rounded-lg bg-black"
                        />
                      </div>
                    )}

                    {/* Audio / Voice Note */}
                    {isAudio && mediaSrc && (
                      <div className="mb-1 max-w-[280px]">
                        <audio src={mediaSrc} controls className="w-full h-9" />
                      </div>
                    )}

                    {/* Document Preview */}
                    {isDoc && mediaSrc && (
                      <a
                        href={mediaSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className={`flex items-center gap-2.5 p-2 rounded-xl transition mb-1 text-xs ${
                          isAgent ? "bg-white/10 hover:bg-white/15 text-white" : "bg-secondary hover:bg-secondary/80 text-foreground"
                        }`}
                      >
                        <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{msg.filename || msg.text || "Document Attachment"}</p>
                          <span className="text-[10px] opacity-70">Click to view / download</span>
                        </div>
                        <Download className="h-4 w-4 opacity-70 shrink-0" />
                      </a>
                    )}

                    {(!isImage && !isVideo && !isDoc) || (msg.text && !msg.text.startsWith("[Image Attachment]") && !msg.text.startsWith("[Video Attachment]")) ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    ) : null}

                    <div
                      className={`flex items-center justify-end gap-1 text-[10px] ${
                        isAgent ? "text-emerald-200/80" : "text-muted-foreground"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {isAgent && (
                        <span>
                          {msg.status === "read" ? (
                            <CheckCheck className="h-3 w-3 text-sky-300 inline" />
                          ) : (
                            <Check className="h-3 w-3 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Bar */}
          <div className="p-2 border-t border-border bg-card/50 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider pl-2 shrink-0">
              Quick Action:
            </span>
            <button
              onClick={() => sendQuickReply("qr")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground shrink-0 cursor-pointer flex items-center gap-1"
            >
              <QrCode className="h-3 w-3 text-primary" /> Send Payment QR
            </button>
            <button
              onClick={() => sendQuickReply("confirm_payment")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground shrink-0 cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Confirm Payment
            </button>
            <button
              onClick={() => sendQuickReply("packing")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Package className="h-3 w-3 text-amber-600" /> Packing (2-3d)
            </button>
            <button
              onClick={() => sendQuickReply("tracking")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Truck className="h-3 w-3 text-sky-600" /> India Post Tracking
            </button>
            <button
              onClick={() => sendQuickReply("delivered")}
              className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 border border-border text-foreground shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Check className="h-3 w-3 text-emerald-600" /> Delivery Confirmed
            </button>
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadFile}
              className="hidden"
              accept="image/*,video/*,audio/*,application/pdf"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              title="Attach photo, video or document"
              className="h-8 w-8 rounded-full border border-border bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground grid place-items-center transition cursor-pointer shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder="Type WhatsApp reply to customer..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 py-2 px-3.5 rounded-full border border-border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center transition hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>

        {/* Right Column: Order & Customer Dossier (3 or 4 cols) */}
        <div className="hidden lg:col-span-3 lg:flex flex-col border-l border-border bg-card/40 overflow-y-auto p-4 space-y-4">
          {selectedConv ? (
            <>
              {/* Customer Profile Card */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-primary" /> Customer Dossier
                  </h4>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Verified Phone
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-foreground">{selectedConv.customerName}</p>
                  <p className="text-muted-foreground text-[11px]">{selectedConv.customerPhone}</p>
                  {selectedConv.customerEmail && (
                    <p className="text-muted-foreground text-[11px]">{selectedConv.customerEmail}</p>
                  )}
                </div>
                {selectedConv.shippingAddress && (
                  <div className="pt-2 border-t border-border space-y-1 text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" /> Delivery Address:
                    </span>
                    <p className="text-foreground leading-snug">
                      {selectedConv.shippingAddress.line1}, {selectedConv.shippingAddress.city},{" "}
                      {selectedConv.shippingAddress.state} - {selectedConv.shippingAddress.postalCode}
                    </p>
                  </div>
                )}
              </div>

              {/* Convert to Wholesale / Retail Lead */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Sales & Lead Management
                  </h4>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Convert this WhatsApp contact into an active B2B wholesale deal or track B2C retail follow-ups.
                </p>
                <Link
                  href={`/admin/leads?newLead=true&phone=${encodeURIComponent(selectedConv.customerPhone)}&name=${encodeURIComponent(selectedConv.customerName)}`}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <TrendingUp className="h-3.5 w-3.5" /> Convert to Lead
                </Link>
              </div>

              {/* Linked Order Card */}
              {selectedConv.orderNumber && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-primary" /> Order #{selectedConv.orderNumber}
                    </h4>
                    <span className="font-bold text-xs text-primary">
                      {inr((selectedConv.orderTotalPaise || 0) / 100)}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1.5 text-muted-foreground bg-secondary/50 p-2.5 rounded-xl border border-border">
                    <p className="font-medium text-foreground">{selectedConv.orderItemsSummary}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-border/80">
                      <span>Method: WhatsApp & Direct UPI</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                          selectedConv.orderPaymentStatus === "collected"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {selectedConv.orderPaymentStatus === "collected" ? "Paid" : "Awaiting Verification"}
                      </span>
                    </div>
                  </div>

                  {selectedConv.orderPaymentStatus !== "collected" && (
                    <button
                      onClick={handleVerifyPayment}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Payment Received
                    </button>
                  )}
                </div>
              )}

              {/* Packaging & Dispatch Stage Card */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" /> 2–3 Day Processing Window
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Shimla Hub</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Prajnaa Market harvest produce undergoes rigorous purity inspection, weighing, and cushioning before dispatch via India Post Speed Post.
                </p>

                {selectedConv.consignmentNumber && (
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3 text-primary" /> India Post Consignment:
                    </span>
                    <div className="flex items-center justify-between bg-secondary/80 px-2.5 py-1.5 rounded-lg border border-border">
                      <code className="text-xs font-mono font-bold text-foreground">
                        {selectedConv.consignmentNumber}
                      </code>
                      <button
                        onClick={() => copyTrackingToClipboard(selectedConv.consignmentNumber!)}
                        className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                        title="Copy tracking number"
                      >
                        {copiedTracking ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Operator Internal Notes */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Operator Notes
                </h4>
                <textarea
                  placeholder="Add internal notes for Prajnaa operations desk..."
                  rows={3}
                  className="w-full text-xs p-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  defaultValue="Customer confirmed delivery preference for morning hours. Produce packed in eco-friendly corrugation."
                />
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-muted-foreground py-10">
              Select a conversation to view order details.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Photo / Video Preview */}
      {selectedLightboxMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedLightboxMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedLightboxMedia(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
              title="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={selectedLightboxMedia.url}
              alt="WhatsApp Media Preview"
              className="max-h-[82vh] w-auto rounded-2xl object-contain shadow-2xl border border-white/10 bg-neutral-900"
            />
            {selectedLightboxMedia.title && selectedLightboxMedia.title !== "Photo" && selectedLightboxMedia.title !== "WhatsApp Image" && (
              <p className="text-white text-xs text-center mt-3 bg-black/60 backdrop-blur-xs px-4 py-1.5 rounded-full max-w-lg">
                {selectedLightboxMedia.title}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
