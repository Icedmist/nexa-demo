import { useCallback, useState } from "react";
import { useDemo } from "@/hooks/useDemo";
import type {
  Item,
  Supplier,
  Location,
  StockMovement,
  PurchaseOrder,
  InventoryRequest,
} from "@/types/inventory";
import type { DemoStore } from "@/lib/demo-store";
import { generateStockAlerts } from "@/lib/notification-generators";

interface MutationResult<TData> {
  mutate: (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => void;
  isLoading: boolean;
  error: Error | null;
}

import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import type { Expense } from "@/types/finance";
import type { Customer } from "@/types/crm";
import type { Notification } from "@/types/inventory";

import { useAuth } from "@/contexts/AuthContext";

function useAppMutation<TData>(
  demoHandler: (store: DemoStore, data: TData) => void,
  firebaseHandler: (data: TData) => Promise<void>
): MutationResult<TData> {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: TData, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
      setIsLoading(true);
      setError(null);
      try {
        if (isDemo && demoStore) {
          demoHandler(demoStore, data);
          bumpVersion();
        } else {
          await firebaseHandler(data);
        }
        opts?.onSuccess?.();
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        opts?.onError?.(err);
      } finally {
        setIsLoading(false);
      }
    },
    [isDemo, demoStore, demoHandler, firebaseHandler, bumpVersion],
  );

  return { mutate, isLoading, error };
}

export function useCreateItem() {
  const { profile } = useAuth();
  return useAppMutation<Item>(
    (store, data) => store.createItem(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "items", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateItem() {
  return useAppMutation<{ id: string; updates: Partial<Item> }>(
    (store, { id, updates }) => store.updateItem(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "items", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteItem() {
  return useAppMutation<string>(
    (store, id) => store.deleteItem(id),
    async (id) => {
      await deleteDoc(doc(db, "items", id));
    }
  );
}


function cleanPayload<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
        cleaned[key] = value;
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanPayload(value as Record<string, unknown>);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

export function useCreateMovement() {
  const { profile } = useAuth();
  const { demoStore, bumpVersion } = useDemo();

  return useAppMutation<StockMovement>(
    (store, data) => {
      store.createMovement(data);
      generateStockAlerts(store);
    },
    async (data) => {
      // 1. Always update local demoStore for immediate UI reaction
      if (demoStore) {
        demoStore.createMovement(data);
        generateStockAlerts(demoStore);
        bumpVersion();
      }

      const { id, ...rest } = data;
      const payload = cleanPayload({
        ...rest,
        storeId: profile?.storeId || "default-store",
        createdAt: data.createdAt || new Date().toISOString(),
      });

      try {
        await runTransaction(db, async (transaction) => {
          // A. Fetch item data (READ - must be before any WRITE in Firestore transaction)
          const itemRef = doc(db, "items", data.itemId);
          const itemSnap = await transaction.get(itemRef);
          
          // B. Record movement (WRITE)
          const movementRef = doc(db, "movements", id);
          transaction.set(movementRef, {
            ...payload,
            createdAt: serverTimestamp(),
          });
          
          // C. Update stock if item exists (WRITE)
          if (itemSnap.exists()) {
            let newStock = Number(itemSnap.data().currentStock) || 0;
            const absQty = Math.abs(data.quantity);
            const moveType = (data.type || "").toLowerCase();

            if (moveType === "received") {
              newStock += absQty;
            } else if (moveType === "shipped") {
              newStock = Math.max(0, newStock - absQty);
            } else if (moveType === "adjusted") {
              newStock = Math.max(0, newStock + data.quantity);
            }
            
            const updates: Record<string, unknown> = cleanPayload({ 
              currentStock: newStock,
              updatedAt: serverTimestamp(),
              ...(moveType === "transferred" && data.toLocationId
                ? { locationId: data.toLocationId }
                : {})
            });

            transaction.update(itemRef, updates);
          }
        });
      } catch (err) {
        console.warn("Firestore movement write error (saved to local state):", err);
        if (!demoStore) {
          handleFirestoreError(err, OperationType.WRITE, `movements/${id}`);
        }
      }
    }
  );
}

export function useCreateCategory() {
  const { profile } = useAuth();
  return useAppMutation<import("@/types/inventory").Category>(
    (store, data) => store.createCategory(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "categories", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateCategory() {
  return useAppMutation<{ id: string; updates: Partial<import("@/types/inventory").Category> }>(
    (store, { id, updates }) => store.updateCategory(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "categories", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteCategory() {
  return useAppMutation<string>(
    (store, id) => store.deleteCategory(id),
    async (id) => {
      await deleteDoc(doc(db, "categories", id));
    }
  );
}

// ─── Purchase Order mutations ───────────────────────────
export function useCreatePurchaseOrder() {
  const { profile } = useAuth();
  return useAppMutation<PurchaseOrder>(
    (store, data) => store.createPurchaseOrder(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "purchaseOrders", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdatePurchaseOrder() {
  return useAppMutation<{ id: string; updates: Partial<PurchaseOrder> }>(
    (store, { id, updates }) => store.updatePurchaseOrder(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "purchaseOrders", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeletePurchaseOrder() {
  return useAppMutation<string>(
    (store, id) => store.deletePurchaseOrder(id),
    async (id) => {
      await deleteDoc(doc(db, "purchaseOrders", id));
    }
  );
}

// ─── Supplier mutations ─────────────────────────────────
export function useCreateSupplier() {
  const { profile } = useAuth();
  return useAppMutation<Supplier>(
    (store, data) => store.createSupplier(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "suppliers", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateSupplier() {
  return useAppMutation<{ id: string; updates: Partial<Supplier> }>(
    (store, { id, updates }) => store.updateSupplier(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "suppliers", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteSupplier() {
  return useAppMutation<string>(
    (store, id) => store.deleteSupplier(id),
    async (id) => {
      await deleteDoc(doc(db, "suppliers", id));
    }
  );
}

// ─── Request mutations ──────────────────────────────────
export function useCreateRequest() {
  const { profile } = useAuth();
  return useAppMutation<InventoryRequest>(
    (store, data) => store.createRequest(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "requests", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateRequest() {
  return useAppMutation<{ id: string; updates: Partial<InventoryRequest> }>(
    (store, { id, updates }) => store.updateRequest(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "requests", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

// ─── Location mutations ─────────────────────────────────
export function useCreateLocation() {
  const { profile } = useAuth();
  return useAppMutation<Location>(
    (store, data) => store.createLocation(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "locations", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateLocation() {
  return useAppMutation<{ id: string; updates: Partial<Location> }>(
    (store, { id, updates }) => store.updateLocation(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "locations", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteLocation() {
  return useAppMutation<string>(
    (store, id) => store.deleteLocation(id),
    async (id) => {
      await deleteDoc(doc(db, "locations", id));
    }
  );
}

// ─── Expense mutations ──────────────────────────────────
export function useCreateExpense() {
  const { profile } = useAuth();
  return useAppMutation<Expense>(
    (store, data) => store.addExpense(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "expenses", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteExpense() {
  return useAppMutation<string>(
    (store, id) => store.deleteExpense(id),
    async (id) => {
      await deleteDoc(doc(db, "expenses", id));
    }
  );
}

// ─── Customer mutations ─────────────────────────────────
export function useCreateCustomer() {
  const { profile } = useAuth();
  return useAppMutation<Customer>(
    (store, data) => store.addCustomer(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "customers", id), {
        ...rest,
        storeId: profile?.storeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useUpdateCustomer() {
  return useAppMutation<{ id: string; updates: Partial<Customer> }>(
    (store, { id, updates }) => store.updateCustomer(id, updates),
    async ({ id, updates }) => {
      await updateDoc(doc(db, "customers", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

// ─── Notification mutations ──────────────────────────────
export function useUpdateNotification() {
  return useAppMutation<{ id: string; updates: Partial<Notification> }>(
    (store, { id, updates }) => {
      const n = store.getNotifications().find(n => n.id === id);
      if (n) Object.assign(n, updates);
    },
    async ({ id, updates }) => {
      await updateDoc(doc(db, "notifications", id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  );
}

export function useDeleteNotification() {
  return useAppMutation<string>(
    (store, id) => store.dismissNotification(id),
    async (id) => {
      await deleteDoc(doc(db, "notifications", id));
    }
  );
}

// ─── Refund mutations ───────────────────────────────────
export function useCreateRefund() {
  const { profile } = useAuth();
  return useAppMutation<import("@/types/finance").Refund>(
    (store, data) => store.addRefund(data),
    async (data) => {
      const { id, ...rest } = data;
      await runTransaction(db, async (transaction) => {
        // 1. Record refund
        transaction.set(doc(db, "refunds", id), {
          ...rest,
          storeId: profile?.storeId,
          createdAt: serverTimestamp()
        });

        // 2. Adjust stock if item is returned to inventory (optional, but good practice)
        // For now we just record the refund
      });
    }
  );
}

export function useCreateNotification() {
  const { profile } = useAuth();
  return useAppMutation<Notification>(
    (store, data) => store.addNotification(data),
    async (data) => {
      const { id, ...rest } = data;
      await setDoc(doc(db, "notifications", id), {
        ...rest,
        storeId: profile?.storeId || "default-store",
        createdAt: data.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  );
}

