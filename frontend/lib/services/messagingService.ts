import { supabase } from "@/integrations/supabase/client";

export interface ChatAttachment {
  name: string;
  url: string;
  type: "image" | "document" | "other";
  size?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  farmerId: string;
  senderType: "farmer" | "admin";
  senderId: string;
  senderName: string;
  departmentTag?: string | null;
  text: string;
  attachments?: ChatAttachment[];
  readAt?: string | null;
  createdAt: string;
  status?: "sending" | "sent" | "delivered" | "read";
}

export interface FarmerConversation {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerSlug?: string | null;
  farmName: string;
  village?: string | null;
  state?: string | null;
  phone?: string | null;
  isVerified?: boolean;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageSender: "farmer" | "admin";
  unreadByFarmer: number;
  unreadByAdmin: number;
  isOnline?: boolean;
}

export interface SendMessageParams {
  farmerId: string;
  senderType: "farmer" | "admin";
  senderId: string;
  senderName: string;
  text: string;
  departmentTag?: string | null;
  attachments?: ChatAttachment[];
}

const STORAGE_PREFIX = "prajnaa_msg_thread_";
const CONV_PREFIX = "prajnaa_conv_meta_";

function getLocalThreadKey(farmerId: string) {
  return `${STORAGE_PREFIX}${farmerId}`;
}

function broadcastUpdate(farmerId: string, eventType: "message" | "read" | "typing", data?: any) {
  if (typeof window !== "undefined") {
    try {
      const bc = new BroadcastChannel("prajnaa-messages-sync");
      bc.postMessage({ farmerId, eventType, data, timestamp: Date.now() });
      bc.close();
    } catch {
      // BroadcastChannel not available
    }
  }
}

/**
 * Resolves all known IDs / aliases (profile id, user_id, slug, full_name) for a given farmer ID.
 */
async function resolveFarmerAliases(farmerId: string): Promise<{
  allIds: string[];
  profile: any | null;
}> {
  const ids = new Set<string>([farmerId]);
  let profile: any = null;

  try {
    const { data } = await supabase
      .from("farmer_profiles")
      .select("id, user_id, full_name, farm_name, slug, village, state, phone, status")
      .or(`id.eq.${farmerId},user_id.eq.${farmerId},slug.eq.${farmerId}`)
      .maybeSingle();

    if (data) {
      profile = data;
      if (data.id) ids.add(data.id);
      if (data.user_id) ids.add(data.user_id);
      if (data.slug) ids.add(data.slug);
    }
  } catch {
    // ignore
  }

  // Also check if any messages in localStorage contain aliases for this farmer
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: ChatMessage[] = JSON.parse(raw);
            if (list.some((m) => ids.has(m.farmerId) || (profile && m.senderName?.toLowerCase() === profile.full_name?.toLowerCase()))) {
              const suffix = key.replace(STORAGE_PREFIX, "");
              if (suffix) ids.add(suffix);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    allIds: Array.from(ids),
    profile,
  };
}

import { fileToBase64 } from "@/lib/file-to-base64";

export const messagingService = {
  /**
   * Securely encode attachment file as permanent Base64 data URL.
   * Storage is private to the sender farmer and the admin.
   */
  async uploadAttachment(file: File): Promise<ChatAttachment> {
    const isImg = file.type.startsWith("image/");
    const isDoc = file.type.includes("pdf") || file.type.includes("word") || file.type.includes("text");
    const fileType: "image" | "document" | "other" = isImg ? "image" : isDoc ? "document" : "other";
    const sizeStr = `${(file.size / 1024).toFixed(0)} KB`;

    const dataUrl = await fileToBase64(file);

    return {
      name: file.name,
      url: dataUrl,
      type: fileType,
      size: sizeStr,
    };
  },

  /**
   * Fetch full message history for a single farmer thread across all aliases (profile id, user_id, name).
   */
  async getThread(farmerId?: string, page = 1, pageSize = 50): Promise<{ messages: ChatMessage[]; totalCount: number }> {
    if (!farmerId) {
      return { messages: [], totalCount: 0 };
    }

    const { allIds, profile } = await resolveFarmerAliases(farmerId);
    const farmerName = profile?.full_name?.toLowerCase();
    const conversationId = `conv_${farmerId}`;
    let dbMessages: ChatMessage[] = [];

    // 1. Try to fetch from Supabase
    try {
      const orClauses: string[] = [];
      allIds.forEach((id) => {
        orClauses.push(`farmer_id.eq.${id}`);
        orClauses.push(`sender_id.eq.${id}`);
      });
      if (farmerName) {
        orClauses.push(`sender_name.ilike.${farmerName}`);
      }

      const { data, error } = await supabase
        .from("farmer_admin_messages")
        .select("*")
        .or(orClauses.join(","))
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        dbMessages = data.map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id || conversationId,
          farmerId: m.farmer_id,
          senderType: m.sender_type,
          senderId: m.sender_id,
          senderName: m.sender_name,
          departmentTag: m.department_tag || null,
          text: m.text,
          attachments: Array.isArray(m.attachments) ? m.attachments : [],
          readAt: m.read_at,
          createdAt: m.created_at,
          status: m.read_at ? "read" : "delivered",
        }));
      }
    } catch (err) {
      console.warn("[messagingService.getThread] Database read notice:", err);
    }

    // 2. Fetch local storage messages across all matching IDs & scanned keys
    let localMessages: ChatMessage[] = [];
    if (typeof window !== "undefined") {
      try {
        const scannedMsgMap = new Map<string, ChatMessage>();

        // Check direct thread keys
        allIds.forEach((id) => {
          const raw = localStorage.getItem(getLocalThreadKey(id));
          if (raw) {
            try {
              const list: ChatMessage[] = JSON.parse(raw);
              list.forEach((m) => scannedMsgMap.set(m.id, m));
            } catch {}
          }
        });

        // Scan all local storage threads
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              try {
                const list: ChatMessage[] = JSON.parse(raw);
                list.forEach((m) => {
                  const matchesId = allIds.includes(m.farmerId) || allIds.includes(m.senderId);
                  const matchesName = farmerName && m.senderName?.toLowerCase() === farmerName;
                  if (matchesId || matchesName) {
                    scannedMsgMap.set(m.id, m);
                  }
                });
              } catch {}
            }
          }
        }

        localMessages = Array.from(scannedMsgMap.values());
      } catch (e) {
        console.warn("[messagingService.getThread] LocalStorage read note:", e);
      }
    }

    // 3. Merge unique messages by ID
    const messageMap = new Map<string, ChatMessage>();
    [...dbMessages, ...localMessages].forEach((m) => {
      messageMap.set(m.id, m);
    });

    const allMessages = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Sync all resolved messages back to local storage keys for fast subsequent access
    if (typeof window !== "undefined" && allMessages.length > 0) {
      try {
        allIds.forEach((id) => {
          localStorage.setItem(getLocalThreadKey(id), JSON.stringify(allMessages));
        });
      } catch {}
    }

    return {
      messages: allMessages,
      totalCount: allMessages.length,
    };
  },

  /**
   * Send a new message in the Farmer ↔ Admin conversation.
   */
  async sendMessage(params: SendMessageParams): Promise<ChatMessage> {
    const { farmerId, senderType, senderId, senderName, text, departmentTag, attachments = [] } = params;
    const { allIds } = await resolveFarmerAliases(farmerId);
    const conversationId = `conv_${farmerId}`;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newMessage: ChatMessage = {
      id: messageId,
      conversationId,
      farmerId,
      senderType,
      senderId,
      senderName,
      departmentTag: departmentTag || (senderType === "admin" ? "General Support" : null),
      text: text.trim(),
      attachments,
      readAt: null,
      createdAt: now,
      status: "sent",
    };

    // 1. Persist to Supabase
    try {
      await supabase.from("farmer_admin_messages").insert({
        id: messageId,
        conversation_id: conversationId,
        farmer_id: farmerId,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        department_tag: newMessage.departmentTag,
        text: newMessage.text,
        attachments: newMessage.attachments,
        read_at: null,
        created_at: now,
      });
    } catch (err) {
      console.warn("[messagingService.sendMessage] Database write notice:", err);
    }

    // 2. Persist to localStorage for all matching IDs
    if (typeof window !== "undefined") {
      try {
        allIds.forEach((id) => {
          const key = getLocalThreadKey(id);
          const existingRaw = localStorage.getItem(key);
          const existing: ChatMessage[] = existingRaw ? JSON.parse(existingRaw) : [];
          if (!existing.some((m) => m.id === newMessage.id)) {
            existing.push(newMessage);
          }
          localStorage.setItem(key, JSON.stringify(existing));

          // Update conversation metadata
          const convKey = `${CONV_PREFIX}${id}`;
          const metaRaw = localStorage.getItem(convKey);
          const meta = metaRaw ? JSON.parse(metaRaw) : {};
          meta.lastMessageText = newMessage.text || (attachments.length > 0 ? `[Attachment] ${attachments[0].name}` : "Sent message");
          meta.lastMessageAt = now;
          meta.lastMessageSender = senderType;
          if (senderType === "farmer") {
            meta.unreadByAdmin = (meta.unreadByAdmin || 0) + 1;
          } else {
            meta.unreadByFarmer = (meta.unreadByFarmer || 0) + 1;
          }
          localStorage.setItem(convKey, JSON.stringify(meta));
        });
      } catch (e) {
        console.warn("[messagingService.sendMessage] LocalStorage write note:", e);
      }
    }

    // 3. Broadcast real-time event for all IDs
    allIds.forEach((id) => {
      broadcastUpdate(id, "message", newMessage);
    });

    return newMessage;
  },

  /**
   * Mark all unread messages as read for a given reader.
   */
  async markAsRead(farmerId: string, readerType: "farmer" | "admin"): Promise<void> {
    const { allIds } = await resolveFarmerAliases(farmerId);
    const now = new Date().toISOString();
    const oppositeSenderType = readerType === "farmer" ? "admin" : "farmer";

    // 1. Update in Supabase
    try {
      for (const id of allIds) {
        await supabase
          .from("farmer_admin_messages")
          .update({ read_at: now })
          .eq("farmer_id", id)
          .eq("sender_type", oppositeSenderType)
          .is("read_at", null);
      }
    } catch (err) {
      console.warn("[messagingService.markAsRead] Database update notice:", err);
    }

    // 2. Update in localStorage across all matching IDs
    if (typeof window !== "undefined") {
      try {
        allIds.forEach((id) => {
          const key = getLocalThreadKey(id);
          const raw = localStorage.getItem(key);
          if (raw) {
            const messages: ChatMessage[] = JSON.parse(raw);
            let changed = false;
            messages.forEach((m) => {
              if (m.senderType === oppositeSenderType && !m.readAt) {
                m.readAt = now;
                m.status = "read";
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem(key, JSON.stringify(messages));
            }
          }

          // Reset unread count on conversation metadata
          const convKey = `${CONV_PREFIX}${id}`;
          const metaRaw = localStorage.getItem(convKey);
          if (metaRaw) {
            const meta = JSON.parse(metaRaw);
            if (readerType === "farmer") {
              meta.unreadByFarmer = 0;
            } else {
              meta.unreadByAdmin = 0;
            }
            localStorage.setItem(convKey, JSON.stringify(meta));
          }
        });
      } catch (e) {
        console.warn("[messagingService.markAsRead] LocalStorage update note:", e);
      }
    }

    // 3. Broadcast read event
    allIds.forEach((id) => {
      broadcastUpdate(id, "read", { readerType, readAt: now });
    });
  },

  /**
   * Admin view: Fetch all farmer conversations sorted by most recent activity.
   */
  async getAllConversations(searchQuery = ""): Promise<FarmerConversation[]> {
    const conversations: FarmerConversation[] = [];

    try {
      // 1. Fetch all registered farmers
      const { data: farmers, error } = await supabase
        .from("farmer_profiles")
        .select("id, user_id, full_name, farm_name, slug, village, state, phone, status, created_at")
        .order("created_at", { ascending: false });

      const farmerList = farmers || [];

      // 2. Also fetch all recent messages from Supabase to ensure live sync
      let allDbMessages: any[] = [];
      try {
        const { data: msgs } = await supabase
          .from("farmer_admin_messages")
          .select("*")
          .order("created_at", { ascending: true });
        allDbMessages = msgs || [];
      } catch {}

      // 3. For each farmer, compile conversation summary
      for (const f of farmerList) {
        const matchingIds = [f.id, f.user_id, f.slug].filter(Boolean) as string[];
        const farmerNameLower = f.full_name?.toLowerCase();

        let lastMessageText = "No messages yet";
        let lastMessageAt = f.created_at || new Date().toISOString();
        let lastMessageSender: "farmer" | "admin" = "admin";
        let unreadByAdmin = 0;
        let unreadByFarmer = 0;

        // Inspect database messages for this farmer
        const farmerDbMessages = allDbMessages.filter(
          (m) =>
            matchingIds.includes(m.farmer_id) ||
            matchingIds.includes(m.sender_id) ||
            (farmerNameLower && m.sender_name?.toLowerCase() === farmerNameLower)
        );

        if (farmerDbMessages.length > 0) {
          const latest = farmerDbMessages[farmerDbMessages.length - 1];
          lastMessageText = latest.text || (latest.attachments?.length > 0 ? `[Attachment] ${latest.attachments[0].name}` : "Message");
          lastMessageAt = latest.created_at;
          lastMessageSender = latest.sender_type;
          unreadByAdmin = farmerDbMessages.filter((m) => m.sender_type === "farmer" && !m.read_at).length;
          unreadByFarmer = farmerDbMessages.filter((m) => m.sender_type === "admin" && !m.read_at).length;
        }

        // Check local storage meta and threads
        if (typeof window !== "undefined") {
          try {
            matchingIds.forEach((id) => {
              const metaRaw = localStorage.getItem(`${CONV_PREFIX}${id}`);
              if (metaRaw) {
                const meta = JSON.parse(metaRaw);
                if (meta.lastMessageText) lastMessageText = meta.lastMessageText;
                if (meta.lastMessageAt && new Date(meta.lastMessageAt) > new Date(lastMessageAt)) {
                  lastMessageAt = meta.lastMessageAt;
                  lastMessageSender = meta.lastMessageSender || lastMessageSender;
                }
                if (meta.unreadByAdmin !== undefined) unreadByAdmin = Math.max(unreadByAdmin, meta.unreadByAdmin);
                if (meta.unreadByFarmer !== undefined) unreadByFarmer = Math.max(unreadByFarmer, meta.unreadByFarmer);
              }

              const threadRaw = localStorage.getItem(getLocalThreadKey(id));
              if (threadRaw) {
                const thread: ChatMessage[] = JSON.parse(threadRaw);
                if (thread.length > 0) {
                  const latest = thread[thread.length - 1];
                  if (new Date(latest.createdAt) >= new Date(lastMessageAt)) {
                    lastMessageText = latest.text || (latest.attachments?.length ? `[Attachment] ${latest.attachments[0].name}` : "Message");
                    lastMessageAt = latest.createdAt;
                    lastMessageSender = latest.senderType;
                  }
                  unreadByAdmin = Math.max(unreadByAdmin, thread.filter((m) => m.senderType === "farmer" && !m.readAt).length);
                  unreadByFarmer = Math.max(unreadByFarmer, thread.filter((m) => m.senderType === "admin" && !m.readAt).length);
                }
              }
            });
          } catch {
            // ignore
          }
        }

        conversations.push({
          id: `conv_${f.id}`,
          farmerId: f.id,
          farmerName: f.full_name || "Registered Farmer",
          farmerSlug: f.slug,
          farmName: f.farm_name || "Organic Farm",
          village: f.village || "Local Farm",
          state: f.state || "India",
          phone: f.phone,
          isVerified: f.status === "approved",
          lastMessageText,
          lastMessageAt,
          lastMessageSender,
          unreadByFarmer,
          unreadByAdmin,
          isOnline: true,
        });
      }
    } catch (err) {
      console.warn("[messagingService.getAllConversations] Error reading farmers:", err);
    }

    // Apply search query filter if provided
    let filtered = conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = conversations.filter(
        (c) =>
          c.farmerName.toLowerCase().includes(q) ||
          c.farmName.toLowerCase().includes(q) ||
          (c.village && c.village.toLowerCase().includes(q)) ||
          (c.state && c.state.toLowerCase().includes(q))
      );
    }

    // Sort by most recent activity
    filtered.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return filtered;
  },

  /**
   * Get unread badge counts for Farmer and Admin navigation items.
   */
  async getUnreadCounts(farmerId?: string): Promise<{ unreadForFarmer: number; unreadForAdminTotal: number }> {
    let unreadForFarmer = 0;
    let unreadForAdminTotal = 0;

    if (typeof window !== "undefined") {
      try {
        if (farmerId) {
          const { allIds } = await resolveFarmerAliases(farmerId);
          allIds.forEach((id) => {
            const threadRaw = localStorage.getItem(getLocalThreadKey(id));
            if (threadRaw) {
              const thread: ChatMessage[] = JSON.parse(threadRaw);
              const unreadInThread = thread.filter((m) => m.senderType === "admin" && !m.readAt).length;
              unreadForFarmer = Math.max(unreadForFarmer, unreadInThread);
            }
          });
        }

        // Count across all storage keys for Admin total
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const thread: ChatMessage[] = JSON.parse(raw);
              const unreadInThread = thread.filter((m) => m.senderType === "farmer" && !m.readAt).length;
              unreadForAdminTotal += unreadInThread;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return {
      unreadForFarmer,
      unreadForAdminTotal,
    };
  },
};
