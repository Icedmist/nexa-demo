import { useState, useEffect } from 'react';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  doc, 
  getDocFromServer, 
  initializeFirestore,
  setLogLevel,
  enableMultiTabIndexedDbPersistence,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase as a singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Mute verbose Firestore logs and warnings because we handle offline mode gracefully
setLogLevel('silent');

// Initialize Firestore as a singleton and store it on the global window object in browser environments to prevent duplicate initialization during HMR/reloads
let dbInstance;
let isPersistenceInitialized = false;

/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof window !== 'undefined') {
  if ((window as any).__firebase_db) {
    dbInstance = (window as any).__firebase_db;
    isPersistenceInitialized = true;
  } else {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    }, firebaseConfig.firestoreDatabaseId);
    (window as any).__firebase_db = dbInstance;
  }
} else {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  }, firebaseConfig.firestoreDatabaseId);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const db = dbInstance;

// Enable offline IndexedDB persistence with multi-tab sync for high speed local caching and offline capabilities (only run once)
if (typeof window !== 'undefined' && !isPersistenceInitialized) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    console.warn("Nexa OS Info: Multi-tab persistence initialization skipped/restricted:", err.message);
  });
}

export const auth = getAuth();

// Set Auth persistence
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(console.error);
}

// Connectivity state tracking
export let isFirebaseOffline = false;
const onConnectivityListeners: ((offline: boolean) => void)[] = [];

export function onConnectivityChange(listener: (offline: boolean) => void) {
  onConnectivityListeners.push(listener);
  // Initial call
  listener(isFirebaseOffline);
  return () => {
    const idx = onConnectivityListeners.indexOf(listener);
    if (idx !== -1) onConnectivityListeners.splice(idx, 1);
  };
}

function updateConnectivity(offline: boolean) {
  if (isFirebaseOffline !== offline) {
    isFirebaseOffline = offline;
    onConnectivityListeners.forEach(l => {
      try {
        l(offline);
      } catch (e) {
        console.error("Connectivity listener error:", e);
      }
    });
  }
}

export function setFirebaseOffline(offline: boolean) {
  if (typeof window !== "undefined") {
    if (offline) {
      localStorage.setItem("nexa_force_offline", "true");
      localStorage.removeItem("nexa_force_online");
    } else {
      localStorage.removeItem("nexa_force_offline");
      localStorage.setItem("nexa_force_online", "true");
    }
    window.dispatchEvent(new Event("nexa-offline-toggle"));
  }
  updateConnectivity(offline);
}

export async function retryFirebaseConnection(): Promise<boolean> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("nexa_force_offline");
    localStorage.setItem("nexa_force_online", "true");
    window.dispatchEvent(new Event("nexa-offline-toggle"));
  }
  updateConnectivity(false);
  await testConnection(true);
  return !isFirebaseOffline;
}

// Global error handler for connection test
export async function testConnection(force = false) {
  if (typeof window !== "undefined" && localStorage.getItem("nexa_force_offline") === "true" && !force) {
    updateConnectivity(true);
    return;
  }
  if (typeof window !== "undefined" && localStorage.getItem("nexa_force_online") === "true") {
    updateConnectivity(false);
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateConnectivity(true);
    return;
  }

  // If browser navigator reports online, default to Online Mode so server APIs and email services work
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    updateConnectivity(false);
    return;
  }

  try {
    await getDocFromServer(doc(db, '_system_', 'connectivity_test'));
    console.log("Firebase connected successfully.");
    updateConnectivity(false);
  } catch (error) {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      updateConnectivity(false);
    } else {
      updateConnectivity(true);
    }
  }
}

// Run connection test in browser and auto-detect when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    testConnection(true);
  });
  window.addEventListener('offline', () => {
    updateConnectivity(true);
  });

  setTimeout(() => {
    testConnection(true);
  }, 2000);

  // Background health check to auto-detect when connection becomes available
  setInterval(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      if (localStorage.getItem("nexa_force_offline") !== "true") {
        testConnection(true);
      }
    }
  }, 15000);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const lowerMsg = errMsg.toLowerCase();
  const isNetwork = lowerMsg.includes('unavailable') || 
                    lowerMsg.includes('could not reach') || 
                    lowerMsg.includes('offline') || 
                    lowerMsg.includes('network-request-failed') ||
                    lowerMsg.includes('failed to get document') ||
                    lowerMsg.includes('not_found') ||
                    lowerMsg.includes('not-found') ||
                    lowerMsg.includes('code: 5') ||
                    lowerMsg.includes('listen');
  
  if (isNetwork) {
    updateConnectivity(true);
    console.warn(`Nexa OS Firestore connectivity warning during ${operationType} on ${path}. Gracefully operating in local fallback state.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirebaseOffline() {
  const [offline, setOffline] = useState(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("nexa_force_online") === "true") return false;
      if (localStorage.getItem("nexa_force_offline") === "true") return true;
      return isFirebaseOffline;
    }
    return isFirebaseOffline;
  });

  useEffect(() => {
    const checkState = () => {
      if (typeof window !== "undefined") {
        if (localStorage.getItem("nexa_force_online") === "true") {
          setOffline(false);
          return;
        }
        if (localStorage.getItem("nexa_force_offline") === "true") {
          setOffline(true);
          return;
        }
      }
      setOffline(isFirebaseOffline);
    };

    window.addEventListener("storage", checkState);
    window.addEventListener("nexa-offline-toggle", checkState);

    const unsub = onConnectivityChange((offlineVal) => {
      if (typeof window !== "undefined") {
        if (localStorage.getItem("nexa_force_online") === "true") {
          setOffline(false);
          return;
        }
        if (localStorage.getItem("nexa_force_offline") === "true") {
          setOffline(true);
          return;
        }
      }
      setOffline(offlineVal);
    });

    return () => {
      window.removeEventListener("storage", checkState);
      window.removeEventListener("nexa-offline-toggle", checkState);
      unsub();
    };
  }, []);

  return offline;
}
