import { EventEmitter } from "events";

type RealtimeEvent = {
  type: string;
  at: string;
  payload: Record<string, any>;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

function channelKey(channel: string) {
  return String(channel || "").trim().toLowerCase();
}

export function publishRealtime(channel: string, event: RealtimeEvent) {
  const key = channelKey(channel);
  if (!key) return;
  emitter.emit(key, event);
}

export function subscribeRealtime(channel: string, onEvent: (event: RealtimeEvent) => void) {
  const key = channelKey(channel);
  if (!key) return () => undefined;
  emitter.on(key, onEvent);
  return () => emitter.off(key, onEvent);
}

