import { useMemo, useCallback } from "react";
import { useDemo } from "@/hooks/useDemo";
import type { Notification } from "@/types/inventory";
import { useFirebaseCollection } from "./useFirebaseData";
import { auth } from "@/lib/firebase";
import { orderBy } from "firebase/firestore";
import { useUpdateNotification, useDeleteNotification } from "./useInventoryMutations";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
}

export function useNotifications(): QueryResult<Notification[]> {
  const { isDemo, demoStore, version } = useDemo();
  const { isAdmin, isSuperAdmin, currentStoreId } = useRole();
  const { profile } = useAuth();
  const enabled = !isDemo && !!auth.currentUser;
  const { data: firebaseData, loading, error } = useFirebaseCollection<Notification>("notifications", [orderBy("createdAt", "desc")], { enabled });

  return useMemo(() => {
    let rawList: Notification[] = [];
    if (isDemo && demoStore) {
      rawList = demoStore.getNotifications();
    } else {
      rawList = firebaseData || [];
    }

    // Notifications should show only for a store for non admins (manager and staff/cashier)
    const isNonAdmin = !isAdmin && !isSuperAdmin;
    const targetStoreId = currentStoreId || profile?.storeId;

    if (isNonAdmin && targetStoreId) {
      rawList = rawList.filter((n) => !n.storeId || n.storeId === targetStoreId);
    }

    return { data: rawList, isLoading: isDemo ? false : loading, error: isDemo ? null : error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, demoStore, version, firebaseData, loading, error, isAdmin, isSuperAdmin, currentStoreId, profile?.storeId]);
}

export function useUnreadCount(): number {
  const { data: notifications } = useNotifications();

  return useMemo(() => {
    return notifications.filter(n => !n.isRead && !n.read).length;
  }, [notifications]);
}

export function useMarkAsRead() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate } = useUpdateNotification();

  return useCallback(
    (id: string) => {
      if (isDemo) {
        demoStore?.markAsRead(id);
        bumpVersion();
      } else {
        mutate({ id, updates: { read: true } });
      }
    },
    [isDemo, demoStore, bumpVersion, mutate],
  );
}

export function useMarkAllAsRead() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { data: notifications } = useNotifications();
  const { mutate } = useUpdateNotification();

  return useCallback(() => {
    if (isDemo) {
      demoStore?.markAllAsRead();
      bumpVersion();
    } else {
      notifications.filter(n => !n.read).forEach(n => {
        mutate({ id: n.id, updates: { read: true } });
      });
    }
  }, [isDemo, demoStore, bumpVersion, notifications, mutate]);
}

export function useDismissNotification() {
  const { isDemo, demoStore, bumpVersion } = useDemo();
  const { mutate } = useDeleteNotification();

  return useCallback(
    (id: string) => {
      if (isDemo) {
        demoStore?.dismissNotification(id);
        bumpVersion();
      } else {
        mutate(id);
      }
    },
    [isDemo, demoStore, bumpVersion, mutate],
  );
}
