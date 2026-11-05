import { useEffect, useRef, useState } from "react";
import { subscribeSettlementUpdates, SettlementUpdatePayload } from "./websocket-server";

export function useSettlementSocket(onUpdate?: (payload: SettlementUpdatePayload) => void) {
  const [isConnected, setIsConnected] = useState(true);
  const lastEventTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Subscribe to backend event emitter
    const unsubscribe = subscribeSettlementUpdates((payload) => {
      lastEventTimeRef.current = Date.now();
      if (onUpdate) {
        onUpdate(payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onUpdate]);

  return {
    isConnected,
    lastEventTime: lastEventTimeRef.current,
  };
}
