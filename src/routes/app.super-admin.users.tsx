import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperUser } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Eye, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useDemo } from "@/hooks/useDemo";

export const Route = createFileRoute("/app/super-admin/users")({
  component: SuperAdminUsers,
});

function SuperAdminUsers() {
  const { superUsers, setSuperUsers, superStores, setLogs } = useSuperAdminContext();
  const [search, setSearch] = useState("");
  const { isDemo } = useDemo();

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperUser | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<SuperUser | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<SuperUser | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager">("manager");
  const [storeId, setStoreId] = useState("");

  const filteredUsers = useMemo(() => {
    return superUsers.filter(
      u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.storeName.toLowerCase().includes(search.toLowerCase())
    );
  }, [superUsers, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !storeId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // Security & Data Integrity: Check for duplicate email
    const duplicateEmail = superUsers.some(u => u.email.trim().toLowerCase() === cleanEmail);
    if (duplicateEmail) {
      toast.error(`Security Alert: A user account with email "${cleanEmail}" already exists.`);
      return;
    }

    const linkedStore = superStores.find(s => s.id === storeId);
    if (!linkedStore) {
      toast.error("Invalid store branch chosen.");
      return;
    }

    setIsSubmitting(true);
    const newUserId = `user-${Date.now()}`;

    const newUser: SuperUser = {
      id: newUserId,
      name: name.trim(),
      email: cleanEmail,
      role,
      storeId,
      storeName: linkedStore.name,
      joinedDate: new Date().toISOString().slice(0, 10),
      status: "active",
    };

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Registered staff profile "${name.trim()}" (${cleanEmail}) for branch: "${linkedStore.name}"`,
      store: linkedStore.name,
      status: "success" as const,
    };

    // Optimistically update local React state so UI responds instantly
    setSuperUsers(prev => [...prev.filter(u => u.id !== newUserId), newUser]);
    setLogs(prev => [newLog, ...prev]);

    if (!isDemo) {
      try {
        const firestoreWrite = Promise.all([
          setDoc(doc(db, "users", newUserId), {
            id: newUserId,
            name: name.trim(),
            email: cleanEmail,
            role,
            storeId,
            storeName: linkedStore.name,
            status: "active",
            onboardingCompleted: true,
            createdAt: new Date().toISOString(),
          }),
          setDoc(doc(db, "system_logs", newLog.id), {
            id: newLog.id,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Registered staff profile "${name.trim()}" (${cleanEmail}) for branch: "${linkedStore.name}"`,
            store: linkedStore.name,
            status: "success",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore user registration warning (saved locally):", err);
      }
    }

    toast.success(`Registered user profile "${name.trim()}" successfully!`);
    setIsAddOpen(false);
    setIsSubmitting(false);

    // Reset form
    setName("");
    setEmail("");
    setRole("manager");
    setStoreId("");
  };

  const openEdit = (user: SuperUser) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role as "admin" | "manager");
    setStoreId(user.storeId);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const cleanEmail = email.trim().toLowerCase();

    // Security & Data Integrity: Check for duplicate email on other users
    const duplicateEmail = superUsers.some(u => u.id !== editingUser.id && u.email.trim().toLowerCase() === cleanEmail);
    if (duplicateEmail) {
      toast.error(`Security Alert: Another user profile is already using the email address "${cleanEmail}".`);
      return;
    }

    const linkedStore = superStores.find(s => s.id === storeId);
    const storeName = linkedStore ? linkedStore.name : editingUser.storeName;

    setIsSubmitting(true);

    setSuperUsers(prev => prev.map(u => u.id === editingUser.id ? {
      ...u,
      name: name.trim(),
      email: cleanEmail,
      role,
      storeId,
      storeName
    } : u));

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Updated credentials and permissions for: "${name.trim()}" (${cleanEmail})`,
      store: storeName,
      status: "info" as const,
    };
    setLogs(prev => [newLog, ...prev]);

    if (!isDemo) {
      try {
        const firestoreWrite = Promise.all([
          updateDoc(doc(db, "users", editingUser.id), {
            name: name.trim(),
            email: cleanEmail,
            role,
            storeId,
            storeName,
          }),
          setDoc(doc(db, "system_logs", newLog.id), {
            id: newLog.id,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Updated credentials and role permissions for: "${name.trim()}" (${cleanEmail})`,
            store: storeName,
            status: "info",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore user update warning (updated locally):", err);
      }
    }

    toast.success(`User profile "${name.trim()}" updated successfully.`);
    setIsEditOpen(false);
    setEditingUser(null);
    setIsSubmitting(false);
  };

  const toggleUserStatus = async (user: SuperUser) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";

    setSuperUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
    toast.info(`"${user.name}" status set to ${nextStatus.toUpperCase()}`);

    if (!isDemo) {
      try {
        const newLogId = `log-${Date.now()}`;
        const firestoreWrite = Promise.all([
          updateDoc(doc(db, "users", user.id), {
            status: nextStatus,
          }),
          setDoc(doc(db, "system_logs", newLogId), {
            id: newLogId,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Changed security status of "${user.name}" to [${nextStatus.toUpperCase()}]`,
            store: user.storeName,
            status: nextStatus === "active" ? "success" : "warning",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore user status toggle warning (toggled locally):", err);
      }
    }
  };

  const handleDeleteUser = async (user: SuperUser) => {
    setIsSubmitting(true);

    // Optimistically update local React state
    setSuperUsers(prev => prev.filter(u => u.id !== user.id));

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Terminated and deleted user credentials: "${user.name}" (${user.email})`,
      store: user.storeName,
      status: "warning" as const,
    };
    setLogs(prev => [newLog, ...prev]);

    if (!isDemo) {
      try {
        const firestoreWrite = Promise.all([
          deleteDoc(doc(db, "users", user.id)),
          setDoc(doc(db, "system_logs", newLog.id), {
            id: newLog.id,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Terminated and deleted user credentials: "${user.name}" (${user.email})`,
            store: user.storeName,
            status: "warning",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore delete user warning (deleted locally):", err);
      }
    }

    toast.success(`User "${user.name}" deleted successfully.`);
    setIsDeleteOpen(false);
    setDeletingUser(null);
    setIsSubmitting(false);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click drag
    const container = e.currentTarget;
    container.style.cursor = "grabbing";
    
    const startX = e.pageX - container.offsetLeft;
    const scrollLeft = container.scrollLeft;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    };
    
    const handleMouseUp = () => {
      container.style.cursor = "grab";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Plus className="h-4 w-4" /> Add Multi-Tenant User
        </Button>
      </div>

      <div 
        className="overflow-x-auto cursor-grab active:cursor-grabbing border border-muted-foreground/10 rounded-lg scrollbar-thin touch-pan-x"
        onMouseDown={handleMouseDown}
      >
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
              <th className="p-3">Staff Name</th>
              <th className="p-3">Email Access Context</th>
              <th className="p-3">System Role</th>
              <th className="p-3">Assigned Branch</th>
              <th className="p-3">Joined On</th>
              <th className="p-3">Security State</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-foreground/10">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="p-3 font-semibold text-foreground">{user.name}</td>
                <td className="p-3 text-muted-foreground font-mono">{user.email}</td>
                <td className="p-3">
                  {user.role === "admin" && (
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/10 text-[10px] font-bold">
                      ADMIN
                    </Badge>
                  )}
                  {user.role === "manager" && (
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10 text-[10px] font-bold">
                      MANAGER
                    </Badge>
                  )}
                  {user.role === "requestor" && (
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/10 text-[10px] font-bold">
                      REQUESTOR
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-foreground font-medium">{user.storeName}</td>
                <td className="p-3 text-muted-foreground font-mono">{user.joinedDate}</td>
                <td className="p-3">
                  <button onClick={() => toggleUserStatus(user)} className="focus:outline-none">
                    {user.status === "active" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold">
                        ACTIVE
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold">
                        LOCKED
                      </Badge>
                    )}
                  </button>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button onClick={() => { setViewingUser(user); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="View details">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => openEdit(user)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Edit user">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button onClick={() => { setDeletingUser(user); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Delete user">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Register Multi-Tenant Staff Profile</DialogTitle>
            <DialogDescription>Authorizes a user account slice and maps them to a physical branch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-xs font-semibold">Staff Full Name</Label>
              <Input id="user-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Chen" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-xs font-semibold">Email Address</Label>
              <Input id="user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. alice@stackwise.io" className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-xs font-semibold">System Authorization Role</Label>
              <select id="user-role" value={role} onChange={e => setRole(e.target.value as "admin" | "manager")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="manager">Store Manager (POS & Inventory control)</option>
                <option value="admin">Store Admin (Full branch permissions)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-store" className="text-xs font-semibold">Assigned Location Branch</Label>
              <select id="user-store" value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none" required>
                <option value="">-- Choose Branch Location --</option>
                {superStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.sector})</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="text-xs h-9">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <span>Authorize Credentials</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans">Modify User Profile</DialogTitle>
            <DialogDescription>Update metadata and locations mapping for this profile slice.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name" className="text-xs font-semibold">Staff Full Name</Label>
              <Input id="edit-user-name" value={name} onChange={e => setName(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email" className="text-xs font-semibold">Email Address</Label>
              <Input id="edit-user-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="text-xs h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-role" className="text-xs font-semibold">System Authorization Role</Label>
              <select id="edit-user-role" value={role} onChange={e => setRole(e.target.value as "admin" | "manager")} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none">
                <option value="manager">Store Manager (POS & Inventory control)</option>
                <option value="admin">Store Admin (Full branch permissions)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-store" className="text-xs font-semibold">Assigned Location Branch</Label>
              <select id="edit-user-store" value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none" required>
                {superStores.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="text-xs h-9">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs h-9 bg-primary hover:bg-primary/95 text-white font-semibold flex items-center justify-center gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-500" />
              Staff Profile Details
            </DialogTitle>
            <DialogDescription>
              Detailed multi-tenant user access authorizations.
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block font-medium">Full Name</span>
                  <span className="font-semibold text-foreground">{viewingUser.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Email Context</span>
                  <span className="font-mono font-bold select-all">{viewingUser.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">System Role</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingUser.role === "admin" ? "bg-red-500/10 text-red-500" :
                    viewingUser.role === "manager" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                  }`}>
                    {viewingUser.role}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Security State</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingUser.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {viewingUser.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Assigned Branch</span>
                  <span className="font-semibold">{viewingUser.storeName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Joined On</span>
                  <span className="font-semibold font-mono">{viewingUser.joinedDate}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">
                  Close Details
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setIsViewOpen(false);
                    openEdit(viewingUser);
                  }}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Configure Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Terminate User Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive. Deleting a user profile revokes their access authorization context immediately.
            </DialogDescription>
          </DialogHeader>
          {deletingUser && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to terminate <span className="font-bold underline">"{deletingUser.name}"</span>'s access credentials?
                This operation cannot be undone.
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting} className="text-xs h-9">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => handleDeleteUser(deletingUser)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Revoking...</span>
                    </>
                  ) : (
                    <span>Revoke Authorization</span>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
