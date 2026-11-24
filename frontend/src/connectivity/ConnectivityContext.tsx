/**
 * Connectivity Context
 *
 * Detects when the network is unavailable and exposes connectivity state
 * to the application. Listens for browser online/offline events and the
 * window events `apiRequest` in `api/client.ts` sends. Polls /api/health
 * for recovery when offline.
 *
 * No offline functionality - the app requires connectivity. This context
 * simply surfaces the state so the UI can block navigation and mutations.
 *
 * Ported from Quill Medical's `lib/connectivity`. Two changes: it asks
 * Juttu's own `checkHealth`, and outside a provider it reads as online
 * rather than throwing, as Juttu's live context does, so a component
 * rendered on its own in a test or a story needs no provider.
 */

/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { API_SUCCESS_EVENT, NETWORK_ERROR_EVENT } from "@/api/client";
import { checkHealth } from "@/api/health";

export interface ConnectivityState {
  /** Whether the backend is currently reachable */
  isOnline: boolean;
  /** Whether a health check is in progress */
  isChecking: boolean;
  /** Timestamp of last successful API response */
  lastSyncedAt: Date | null;
  /** Whether the offline modal should be shown (user attempted action) */
  showOfflineModal: boolean;
  /** Whether we recently reconnected (for strip state) */
  isReconnected: boolean;
}

export interface ConnectivityActions {
  /** Dismiss the offline modal */
  dismissOfflineModal: () => void;
  /** Manually trigger a health check */
  retry: () => void;
  /** Trigger the offline modal (called by navigation blocker) */
  triggerOfflineModal: () => void;
  /** Clear the reconnected state (called on navigation) */
  clearReconnected: () => void;
}

export type ConnectivityCtx = ConnectivityState & ConnectivityActions;

/** Outside a provider: online, with nothing to show and nothing to do. */
const ALWAYS_ONLINE: ConnectivityCtx = {
  isOnline: true,
  isChecking: false,
  lastSyncedAt: null,
  showOfflineModal: false,
  isReconnected: false,
  dismissOfflineModal: () => {},
  retry: () => {},
  triggerOfflineModal: () => {},
  clearReconnected: () => {},
};

const Context = createContext<ConnectivityCtx>(ALWAYS_ONLINE);

const POLL_INTERVAL_MS = 10_000;
const DEBOUNCE_MS = 1_000;
const HEALTH_TIMEOUT_MS = 5_000;

/** Juttu's health check, given up on after five seconds. */
async function checkHealthInTime(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    return await checkHealth(controller.signal);
  } catch {
    // Only an abort is thrown: the check took too long.
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [isReconnected, setIsReconnected] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasOfflineRef = useRef(false);

  const goOffline = useCallback(() => {
    setIsOnline(false);
    wasOfflineRef.current = true;
  }, []);

  const goOnline = useCallback(() => {
    if (wasOfflineRef.current) {
      setIsReconnected(true);
    }
    setIsOnline(true);
  }, []);

  const runHealthCheck = useCallback(async () => {
    setIsChecking(true);
    const healthy = await checkHealthInTime();
    setIsChecking(false);
    if (healthy) {
      goOnline();
    } else {
      goOffline();
    }
    return healthy;
  }, [goOnline, goOffline]);

  // Browser online/offline events
  useEffect(() => {
    const handleOffline = () => {
      // Debounce: wait before confirming offline
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        goOffline();
      }, DEBOUNCE_MS);
    };

    const handleOnline = () => {
      // Clear any pending offline debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      // Verify with health check before marking online
      void runHealthCheck();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [goOffline, runHealthCheck]);

  // Custom DOM events from api.ts
  useEffect(() => {
    const handleNetworkError = () => {
      // Debounce before flipping to offline
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        goOffline();
        setShowOfflineModal(true);
      }, DEBOUNCE_MS);
    };

    const handleApiSuccess = () => {
      // Clear any pending offline debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setLastSyncedAt(new Date());
      if (!isOnline) {
        goOnline();
      }
    };

    window.addEventListener(NETWORK_ERROR_EVENT, handleNetworkError);
    window.addEventListener(API_SUCCESS_EVENT, handleApiSuccess);

    return () => {
      window.removeEventListener(NETWORK_ERROR_EVENT, handleNetworkError);
      window.removeEventListener(API_SUCCESS_EVENT, handleApiSuccess);
    };
  }, [goOffline, goOnline, isOnline]);

  // Auto-poll when offline
  useEffect(() => {
    if (!isOnline) {
      pollRef.current = setInterval(() => {
        void runHealthCheck();
      }, POLL_INTERVAL_MS);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOnline, runHealthCheck]);

  // Set data-offline attribute on document root for CSS theming
  useEffect(() => {
    if (!isOnline) {
      document.documentElement.setAttribute("data-offline", "");
    } else {
      document.documentElement.removeAttribute("data-offline");
    }
  }, [isOnline]);

  const dismissOfflineModal = useCallback(() => {
    setShowOfflineModal(false);
  }, []);

  const triggerOfflineModal = useCallback(() => {
    setShowOfflineModal(true);
  }, []);

  const clearReconnected = useCallback(() => {
    setIsReconnected(false);
    wasOfflineRef.current = false;
  }, []);

  const retry = useCallback(() => {
    void runHealthCheck();
  }, [runHealthCheck]);

  const value: ConnectivityCtx = {
    isOnline,
    isChecking,
    lastSyncedAt,
    showOfflineModal,
    isReconnected,
    dismissOfflineModal,
    triggerOfflineModal,
    clearReconnected,
    retry,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/**
 * useConnectivity
 *
 * Access connectivity state and actions from any component within the
 * ConnectivityProvider tree. Outside one, it reads as online.
 */
export function useConnectivity(): ConnectivityCtx {
  return useContext(Context);
}
