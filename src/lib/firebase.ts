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

// Global error handler for connection test
async function testConnection(force = false) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateConnectivity(true);
    return;
  }
  if (isFirebaseOffline && !force) {
    return;
  }
  try {
    // Try to get a document directly from the server. 
    // This will fail fast if the config or network is broken.
    await getDocFromServer(doc(db, '_system_', 'connectivity_test'));
    console.log("Firebase connected successfully.");
    updateConnectivity(false);
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('offline') || 
        msg.includes('network-request-failed') || 
        msg.includes('unavailable') || 
        msg.includes('could not reach') ||
        msg.includes('not_found') ||
        msg.includes('not-found') ||
        msg.includes('code: 5') ||
        msg.includes('listen') ||
        (error.name === 'FirebaseError' && msg.includes('failed'))
      ) {
        console.warn("Nexa OS Info: Cloud Firestore database is unreachable or unprovisioned in this environment. Seamlessly operating in local-first demo fallback mode.");
        updateConnectivity(true);
      } else if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        console.log("Firebase connection verified (permission boundaries intact).");
        updateConnectivity(false);
      } else {
        console.log("Firebase connection info:", error.message);
        updateConnectivity(true);
      }
    }
  }
}

// Run connection test in browser after a short delay to allow Auth state to initialize first
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    testConnection(true);
  });
  window.addEventListener('offline', () => {
    updateConnectivity(true);
  });

  setTimeout(() => {
    testConnection(true);
  }, 2500);
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
      return localStorage.getItem("nexa_force_offline") === "true" || isFirebaseOffline;
    }
    return isFirebaseOffline;
  });

  useEffect(() => {
    const checkState = () => {
      const forced = typeof window !== "undefined" && localStorage.getItem("nexa_force_offline") === "true";
      setOffline(forced || isFirebaseOffline);
    };

    window.addEventListener("storage", checkState);
    window.addEventListener("nexa-offline-toggle", checkState);

    const unsub = onConnectivityChange((offlineVal) => {
      const forced = typeof window !== "undefined" && localStorage.getItem("nexa_force_offline") === "true";
      setOffline(forced || offlineVal);
    });

    return () => {
      window.removeEventListener("storage", checkState);
      window.removeEventListener("nexa-offline-toggle", checkState);
      unsub();
    };
  }, []);

  return offline;
}
