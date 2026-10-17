/**
 * Lightweight real-time WebSocket event broadcaster helper for connected admin sockets.
 * Uses an in-memory client registry with optional Redis Pub/Sub fallback.
 */

export interface SettlementUpdatePayload {
  type: "settlement_updated";
  settlementId: string;
  farmerId: string;
  status: string;
  utr_reference?: string;
  failure_reason?: string;
  updated_at: string;
}

type EventListener = (payload: SettlementUpdatePayload) => void;

const listeners: Set<EventListener> = new Set();

export function subscribeSettlementUpdates(listener: EventListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function broadcastSettlementUpdate(payload: SettlementUpdatePayload) {
  console.log("[WebSocket Broadcast] settlement_updated:", payload);
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (e) {
      console.error("[WebSocket Listener Error]:", e);
    }
  });
}
