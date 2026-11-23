import { useSyncExternalStore } from "react";

export type ConnectionStatus = "live" | "reconnecting" | "offline";

let apiReachable = false;
const listeners = new Set<() => void>();

function getSnapshot(): ConnectionStatus {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  return apiReachable ? "live" : "reconnecting";
}

function notify() {
  listeners.forEach(listener => listener());
}

export function reportApiReachable(reachable: boolean) {
  apiReachable = reachable;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("offline", notify);
  window.addEventListener("online", () => {
    apiReachable = false;
    notify();
  });
}

export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, getSnapshot, () => "reconnecting");
}
