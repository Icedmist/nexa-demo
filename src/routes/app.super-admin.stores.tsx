import { createFileRoute } from "@tanstack/react-router";
import { useSuperAdminContext, SuperStore } from "./app.super-admin";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Eye, Trash2, Building2, MapPin, Loader2, Palette, Sparkles, Store, Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useDemo } from "@/hooks/useDemo";

export const Route = createFileRoute("/app/super-admin/stores")({
  component: SuperAdminStores,
});

const SECTOR_LABELS: Record<string, string> = {
  agriculture: "Agribusiness",
  pharmacy: "Pharmacy Hub",
  restaurant: "Food & Restaurant",
  social_commerce: "Online Vendor",
  general: "General Retail",
};

const BRAND_COLORS = [
  { label: "Teal", value: "#0d9488" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Orange", value: "#f97316" },
  { label: "Green", value: "#22c55e" },
  { label: "Emerald", value: "#059669" },
  { label: "Indigo", value: "#6366f1" },
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

function SuperAdminStores() {
  const { superStores, setSuperStores, superUsers, setSuperUsers, currentStoreId, setCurrentStoreId, logs, setLogs } = useSuperAdminContext();
  const [search, setSearch] = useState("");
  const { isDemo } = useDemo();

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<SuperStore | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingStore, setViewingStore] = useState<SuperStore | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingStore, setDeletingStore] = useState<SuperStore | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [sector, setSector] = useState<string>("general");
  const [manager, setManager] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [valuation, setValuation] = useState("500000");
  const [storeCountry, setStoreCountry] = useState("Nigeria");
  const [storeState, setStoreState] = useState("");
  const [storeLga, setStoreLga] = useState("");
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [tagline, setTagline] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [logoUrl, setLogoUrl] = useState("");

  const openAddStore = () => {
    setName("");
    setSector("general");
    setManager("");
    setManagerEmail("");
    setValuation("500000");
    setStoreCountry("Nigeria");
    setStoreState("");
    setStoreLga("");
    setBrandColor("#0d9488");
    setTagline("Quality Products & Premier Service");
    setCurrency("NGN");
    setLogoUrl("");
    setIsAddOpen(true);
  };

  const filteredStores = useMemo(() => {
    return superStores.filter(
      s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.manager.toLowerCase().includes(search.toLowerCase()) ||
        s.sector.toLowerCase().includes(search.toLowerCase())
    );
  }, [superStores, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !manager.trim() || !managerEmail.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const cleanManagerEmail = managerEmail.trim().toLowerCase();

    // Security & Data Integrity: Prevent duplicate email accounts
    const duplicateEmail = superUsers.some(u => u.email.trim().toLowerCase() === cleanManagerEmail) ||
                           superStores.some(s => s.managerEmail.trim().toLowerCase() === cleanManagerEmail);
    if (duplicateEmail) {
      toast.error(`Security Alert: An account or store manager with email "${cleanManagerEmail}" already exists.`);
      return;
    }

    setIsSubmitting(true);

    const newStoreId = `store-${Date.now()}`;
    const newStoreValuation = Number(valuation) || 0;

    const newStore: SuperStore = {
      id: newStoreId,
      name: name.trim(),
      sector,
      manager: manager.trim(),
      managerEmail: cleanManagerEmail,
      itemCount: 0,
      valuationNgn: newStoreValuation,
      healthScore: 100,
      alerts: 0,
      status: "active",
      country: storeCountry,
      state: storeState,
      lga: storeLga,
      brandColor,
      tagline: tagline.trim(),
      currency,
      logoUrl: logoUrl.trim(),
    };

    const newUser = {
      id: `user-${Date.now()}`,
      name: manager.trim(),
      email: cleanManagerEmail,
      role: "admin" as const,
      storeId: newStoreId,
      storeName: name.trim(),
      joinedDate: new Date().toISOString().slice(0, 10),
      status: "active" as const,
    };

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Provisioned new storefront: "${name.trim()}" (${cleanManagerEmail})`,
      store: name.trim(),
      status: "success" as const,
    };

    // Optimistically update local React state so UI updates instantly
    setSuperStores(prev => [...prev.filter(s => s.id !== newStoreId), newStore]);
    setSuperUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
    setLogs(prev => [newLog, ...prev]);

    if (!isDemo) {
      try {
        const firestoreWrite = Promise.all([
          setDoc(doc(db, "stores", newStoreId), {
            id: newStoreId,
            storeName: name.trim(),
            businessType: sector,
            ownerName: manager.trim(),
            ownerEmail: cleanManagerEmail,
            valuationNgn: newStoreValuation,
            healthScore: 100,
            alerts: 0,
            status: "active",
            isOnboarded: true,
            createdAt: new Date().toISOString(),
            country: storeCountry,
            state: storeState,
            lga: storeLga,
            brandColor,
            primaryColor: brandColor,
            tagline: tagline.trim(),
            currency,
            logoUrl: logoUrl.trim(),
          }),
          setDoc(doc(db, "users", newUser.id), {
            id: newUser.id,
            name: manager.trim(),
            email: cleanManagerEmail,
            role: "admin",
            storeId: newStoreId,
            storeName: name.trim(),
            status: "active",
            onboardingCompleted: true,
            createdAt: new Date().toISOString(),
          }),
          setDoc(doc(db, "system_logs", newLog.id), {
            id: newLog.id,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Provisioned new multi-tenant storefront: "${name.trim()}" (${cleanManagerEmail})`,
            store: name.trim(),
            status: "success",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore sync warning (provisioned locally):", err);
      }
    }

    toast.success(`Storefront "${name.trim()}" provisioned successfully!`);
    setIsAddOpen(false);
    setIsSubmitting(false);

    // Reset form
    setName("");
    setManager("");
    setManagerEmail("");
    setValuation("500000");
    setStoreCountry("Nigeria");
    setStoreState("");
    setStoreLga("");
    setBrandColor("#0d9488");
    setTagline("");
    setCurrency("NGN");
    setLogoUrl("");
  };

  const openEdit = (store: SuperStore) => {
    setEditingStore(store);
    setName(store.name);
    setSector(store.sector);
    setManager(store.manager);
    setManagerEmail(store.managerEmail);
    setValuation(store.valuationNgn.toString());
    setStoreCountry(store.country || "Nigeria");
    setStoreState(store.state || "");
    setStoreLga(store.lga || "");
    setBrandColor(store.brandColor || "#0d9488");
    setTagline(store.tagline || "");
    setCurrency(store.currency || "NGN");
    setLogoUrl(store.logoUrl || "");
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    const cleanManagerEmail = managerEmail.trim().toLowerCase();

    // Security & Data Integrity: Check for duplicate manager email on other stores/users
    const duplicateEmail = superUsers.some(u => u.email.trim().toLowerCase() === cleanManagerEmail && u.storeId !== editingStore.id) ||
                           superStores.some(s => s.id !== editingStore.id && s.managerEmail.trim().toLowerCase() === cleanManagerEmail);
    if (duplicateEmail) {
      toast.error(`Security Alert: Another store or user is already associated with email "${cleanManagerEmail}".`);
      return;
    }

    setIsSubmitting(true);
    const updatedValuation = Number(valuation) || 0;

    setSuperStores(prev => prev.map(s => s.id === editingStore.id ? {
      ...s,
      name: name.trim(),
      sector,
      manager: manager.trim(),
      managerEmail: cleanManagerEmail,
      valuationNgn: updatedValuation,
      country: storeCountry,
      state: storeState,
      lga: storeLga,
      brandColor,
      tagline: tagline.trim(),
      currency,
      logoUrl: logoUrl.trim(),
    } : s));

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: "nexatechnologies.dev@gmail.com",
      action: `Modified configuration parameters for: "${name.trim()}" (${cleanManagerEmail})`,
      store: name.trim(),
      status: "info" as const,
    };
    setLogs(prev => [newLog, ...prev]);

    if (!isDemo) {
      try {
        const firestoreWrite = Promise.all([
          updateDoc(doc(db, "stores", editingStore.id), {
            storeName: name.trim(),
            businessType: sector,
            ownerName: manager.trim(),
            ownerEmail: cleanManagerEmail,
            valuationNgn: updatedValuation,
            country: storeCountry,
            state: storeState,
            lga: storeLga,
            brandColor,
            primaryColor: brandColor,
            tagline: tagline.trim(),
            currency,
            logoUrl: logoUrl.trim(),
          }),
          setDoc(doc(db, "system_logs", newLog.id), {
            id: newLog.id,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Modified configuration parameters for: "${name.trim()}" (${cleanManagerEmail})`,
            store: name.trim(),
            status: "info",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore update warning (updated locally):", err);
      }
    }

    toast.success(`Store "${name.trim()}" updated successfully.`);
    setIsEditOpen(false);
    setEditingStore(null);
    setIsSubmitting(false);
  };

  const toggleStoreStatus = async (store: SuperStore) => {
    const nextStatusMap: Record<SuperStore["status"], SuperStore["status"]> = {
      active: "maintenance",
      maintenance: "suspended",
      suspended: "active",
    };
    const nextStatus = nextStatusMap[store.status];

    setSuperStores(prev => prev.map(s => s.id === store.id ? { ...s, status: nextStatus } : s));
    toast.info(`"${store.name}" is now in ${nextStatus.toUpperCase()} mode.`);

    if (!isDemo) {
      try {
        const newLogId = `log-${Date.now()}`;
        const firestoreWrite = Promise.all([
          updateDoc(doc(db, "stores", store.id), {
            status: nextStatus,
          }),
          setDoc(doc(db, "system_logs", newLogId), {
            id: newLogId,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Toggled state of "${store.name}" to [${nextStatus.toUpperCase()}]`,
            store: store.name,
            status: nextStatus === "active" ? "success" : "warning",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore status toggle warning (toggled locally):", err);
      }
    }
  };

  const handleDeleteStore = async (store: SuperStore) => {
    setSuperStores(prev => prev.filter(s => s.id !== store.id));
    toast.success(`Storefront "${store.name}" deleted successfully.`);
    setIsDeleteOpen(false);
    setDeletingStore(null);

    if (!isDemo) {
      try {
        const newLogId = `log-${Date.now()}`;
        const firestoreWrite = Promise.all([
          deleteDoc(doc(db, "stores", store.id)),
          setDoc(doc(db, "system_logs", newLogId), {
            id: newLogId,
            timestamp: new Date().toISOString(),
            user: "nexatechnologies.dev@gmail.com",
            action: `Terminated and deleted multi-tenant storefront: "${store.name}"`,
            store: store.name,
            status: "warning",
          }),
        ]);

        firestoreWrite.catch(() => {});
        await Promise.race([
          firestoreWrite,
          new Promise(res => setTimeout(res, 2500))
        ]);
      } catch (err) {
        console.warn("Firestore delete warning (deleted locally):", err);
      }
    }
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
            placeholder="Search branches..."
            className="pl-9 h-9 text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAddStore} className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
          <Plus className="h-4 w-4" /> Provision Storefront
        </Button>
      </div>

      <div 
        className="overflow-x-auto cursor-grab active:cursor-grabbing border border-muted-foreground/10 rounded-lg scrollbar-thin touch-pan-x"
        onMouseDown={handleMouseDown}
      >
        <table className="w-full text-left text-xs border-collapse min-w-[950px]">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground font-semibold">
              <th className="p-3">Branch Name</th>
              <th className="p-3">Vertical / Sector</th>
              <th className="p-3">Branch Manager</th>
              <th className="p-3 text-right">Items</th>
              <th className="p-3 text-right">Inventory Value</th>
              <th className="p-3 text-center">Health</th>
              <th className="p-3">GCP Tenant Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-muted-foreground/10">
            {filteredStores.map(store => {
              const isCurrentlySelected = currentStoreId === store.id;
              return (
                <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0 border border-border shadow-2xs"
                        style={{ backgroundColor: store.brandColor || "#0d9488" }}
                        title={`Brand Theme Accent: ${store.brandColor || "#0d9488"}`}
                      />
                      <span>{store.name}</span>
                      {isCurrentlySelected && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10 text-[10px] py-0 px-1.5 font-bold uppercase">
                          Selected
                        </Badge>
                      )}
                    </div>
                    {(store.state || store.country) && (
                      <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                        <span>{store.lga ? `${store.lga}, ` : ""}{store.state ? `${store.state}, ` : ""}{store.country}</span>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="font-semibold text-[10px] uppercase">
                      {SECTOR_LABELS[store.sector] || store.sector}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div className="font-medium text-foreground">{store.manager}</div>
                    <div className="text-[10px] font-mono">{store.managerEmail}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-medium">{store.itemCount}</td>
                  <td className="p-3 text-right font-mono font-semibold">₦{store.valuationNgn.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <span className={`font-mono font-bold ${store.healthScore >= 90 ? "text-emerald-500" : store.healthScore >= 75 ? "text-amber-500" : "text-red-500"}`}>
                      {store.healthScore}%
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => toggleStoreStatus(store)} className="focus:outline-none">
                      {store.status === "active" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold">
                          ACTIVE
                        </Badge>
                      )}
                      {store.status === "maintenance" && (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 text-[10px] font-bold">
                          MAINTENANCE
                        </Badge>
                      )}
                      {store.status === "suspended" && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 text-[10px] font-bold">
                          SUSPENDED
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button onClick={() => { setViewingStore(store); setIsViewOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500" title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => setCurrentStoreId(store.id)} variant="ghost" size="icon" className={`h-7 w-7 hover:text-emerald-500 ${isCurrentlySelected ? "text-emerald-500 font-bold" : "text-muted-foreground"}`} title="Impersonate branch">
                        <Building2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => openEdit(store)} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Configure settings">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button onClick={() => { setDeletingStore(store); setIsDeleteOpen(true); }} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500" title="Delete storefront">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Provision store Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              Provision New Branch Storefront
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deploys a containerized multitenant DB slice with custom client branding, colors, and location parameters.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            {/* Live Client Storefront Card Preview */}
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs space-y-0">
              <div className="px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-white transition-colors" style={{ backgroundColor: brandColor }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-bold truncate text-xs">{name.trim() || "Storefront Name"}</span>
                </div>
                <Badge className="bg-white/20 text-white hover:bg-white/30 text-[9px] uppercase font-bold border-none shrink-0">
                  {SECTOR_LABELS[sector] || sector}
                </Badge>
              </div>
              <div className="p-3 bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  {logoUrl.trim() ? (
                    <img src={logoUrl.trim()} alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-border/60 shadow-2xs shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-2xs shrink-0" style={{ backgroundColor: brandColor }}>
                      {(name.trim() || "S").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-bold text-foreground text-xs truncate">{name.trim() || "New Storefront"}</p>
                    <p className="text-[11px] text-muted-foreground truncate italic">{tagline.trim() || "Store slogan / brand identity tagline..."}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-medium"><Globe className="h-3 w-3 text-emerald-500 shrink-0" /> {storeCountry} {storeState ? `• ${storeState}` : ""}</span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-foreground">Currency: {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Branding & Visual Customization */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground border-b pb-1">
                  <Palette className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Branding & Visual Customization</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="store-name" className="text-xs font-semibold">Storefront Name *</Label>
                  <Input id="store-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Surulere Retail Hub" className="text-xs h-8.5" required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="store-tagline" className="text-xs font-semibold">Tagline / Brand Slogan</Label>
                  <Input id="store-tagline" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Quality Goods & Fast Delivery" className="text-xs h-8.5" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Primary Brand Accent Color</span>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{brandColor}</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {BRAND_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setBrandColor(c.value)}
                        className={`h-6 w-6 rounded-full transition-all border-2 flex items-center justify-center shrink-0 ${
                          brandColor === c.value ? "border-foreground scale-110 shadow-2xs" : "border-transparent opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      >
                        {brandColor === c.value && <Check className="h-3 w-3 text-white drop-shadow-xs" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="h-6 w-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden bg-transparent"
                      title="Custom Hex Color"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="store-logo" className="text-xs font-semibold">Store Logo URL (Optional)</Label>
                  <Input id="store-logo" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="text-xs h-8.5 font-mono" />
                </div>
              </div>

              {/* Right Column: Operations & Location */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground border-b pb-1">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Operations & Location Parameters</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="store-sector" className="text-xs font-semibold">Vertical Sector Category Mode</Label>
                  <select id="store-sector" value={sector} onChange={e => setSector(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                    <option value="agriculture">Agribusiness / Agri-supply</option>
                    <option value="pharmacy">Pharmacy / Healthcare Retail</option>
                    <option value="restaurant">Food & Restaurant Service</option>
                    <option value="social_commerce">Online Vendor (Social Commerce)</option>
                    <option value="electronics">Phones & Accessories</option>
                    <option value="retail">Retail / POS</option>
                    <option value="general">General Retail Store</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="store-manager" className="text-xs font-semibold">Assigned Manager *</Label>
                    <Input id="store-manager" value={manager} onChange={e => setManager(e.target.value)} placeholder="e.g. John Doe" className="text-xs h-8.5" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="store-email" className="text-xs font-semibold">Manager Email *</Label>
                    <Input id="store-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="manager@store.io" className="text-xs h-8.5" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="store-currency" className="text-xs font-semibold">Operating Currency</Label>
                    <select id="store-currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                      <option value="NGN">NGN (₦ - Naira)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="store-valuation" className="text-xs font-semibold">Asset Valuation</Label>
                    <Input id="store-valuation" type="number" value={valuation} onChange={e => setValuation(e.target.value)} className="text-xs h-8.5 font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="store-country" className="text-xs font-semibold">Country</Label>
                    <select id="store-country" value={storeCountry} onChange={e => {
                      setStoreCountry(e.target.value);
                      if (e.target.value !== "Nigeria") {
                        setStoreState("");
                        setStoreLga("");
                      }
                    }} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                      <option value="Nigeria">Nigeria 🇳🇬</option>
                      <option value="Other">Other Global Location</option>
                    </select>
                  </div>
                  {storeCountry === "Nigeria" ? (
                    <div className="space-y-1">
                      <Label htmlFor="store-state" className="text-xs font-semibold">State</Label>
                      <select id="store-state" value={storeState} onChange={e => setStoreState(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                        <option value="">-- State --</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="store-state" className="text-xs font-semibold">State / Region</Label>
                      <Input id="store-state" value={storeState} onChange={e => setStoreState(e.target.value)} placeholder="e.g. California" className="text-xs h-8.5" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="store-lga" className="text-xs font-semibold">
                    {storeCountry === "Nigeria" ? "LGA (Local Govt Area)" : "County / District"}
                  </Label>
                  <Input id="store-lga" value={storeLga} onChange={e => setStoreLga(e.target.value)} placeholder={storeCountry === "Nigeria" ? "e.g. Ikeja" : "e.g. Orange County"} className="text-xs h-8.5" />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="text-xs h-9">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <span>Provision Container</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit store Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Configure Store Parameters & Branding
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify brand theme colors, logo, slogan, and tenant configuration parameters for this store slice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 pt-1">
            {/* Live Client Storefront Card Preview */}
            <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs space-y-0">
              <div className="px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-white transition-colors" style={{ backgroundColor: brandColor }}>
                <div className="flex items-center gap-2 min-w-0">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-bold truncate text-xs">{name.trim() || "Storefront Name"}</span>
                </div>
                <Badge className="bg-white/20 text-white hover:bg-white/30 text-[9px] uppercase font-bold border-none shrink-0">
                  {SECTOR_LABELS[sector] || sector}
                </Badge>
              </div>
              <div className="p-3 bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center gap-3">
                  {logoUrl.trim() ? (
                    <img src={logoUrl.trim()} alt="Logo" className="h-10 w-10 rounded-lg object-cover border border-border/60 shadow-2xs shrink-0" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  ) : (
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-2xs shrink-0" style={{ backgroundColor: brandColor }}>
                      {(name.trim() || "S").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="font-bold text-foreground text-xs truncate">{name.trim() || "Storefront"}</p>
                    <p className="text-[11px] text-muted-foreground truncate italic">{tagline.trim() || "Store slogan / brand identity tagline..."}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                      <span className="flex items-center gap-1 font-medium"><Globe className="h-3 w-3 text-emerald-500 shrink-0" /> {storeCountry} {storeState ? `• ${storeState}` : ""}</span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-foreground">Currency: {currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Branding & Visual Customization */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground border-b pb-1">
                  <Palette className="h-3.5 w-3.5 text-primary" />
                  <span>Branding & Visual Customization</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-name" className="text-xs font-semibold">Storefront Name *</Label>
                  <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} className="text-xs h-8.5" required />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-tagline" className="text-xs font-semibold">Tagline / Brand Slogan</Label>
                  <Input id="edit-tagline" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Quality Goods & Fast Delivery" className="text-xs h-8.5" />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Primary Brand Accent Color</span>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{brandColor}</span>
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {BRAND_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setBrandColor(c.value)}
                        className={`h-6 w-6 rounded-full transition-all border-2 flex items-center justify-center shrink-0 ${
                          brandColor === c.value ? "border-foreground scale-110 shadow-2xs" : "border-transparent opacity-85 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      >
                        {brandColor === c.value && <Check className="h-3 w-3 text-white drop-shadow-xs" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="h-6 w-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden bg-transparent"
                      title="Custom Hex Color"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-logo" className="text-xs font-semibold">Store Logo URL (Optional)</Label>
                  <Input id="edit-logo" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." className="text-xs h-8.5 font-mono" />
                </div>
              </div>

              {/* Right Column: Operations & Location */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground border-b pb-1">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>Operations & Location Parameters</span>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-sector" className="text-xs font-semibold">Vertical Sector Category Mode</Label>
                  <select id="edit-sector" value={sector} onChange={e => setSector(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                    <option value="agriculture">Agribusiness / Agri-supply</option>
                    <option value="pharmacy">Pharmacy / Healthcare Retail</option>
                    <option value="restaurant">Food & Restaurant Service</option>
                    <option value="social_commerce">Online Vendor (Social Commerce)</option>
                    <option value="electronics">Phones & Accessories</option>
                    <option value="retail">Retail / POS</option>
                    <option value="general">General Retail Store</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-manager" className="text-xs font-semibold">Assigned Manager *</Label>
                    <Input id="edit-manager" value={manager} onChange={e => setManager(e.target.value)} className="text-xs h-8.5" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email" className="text-xs font-semibold">Manager Email *</Label>
                    <Input id="edit-email" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} className="text-xs h-8.5" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-currency" className="text-xs font-semibold">Operating Currency</Label>
                    <select id="edit-currency" value={currency} onChange={e => setCurrency(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                      <option value="NGN">NGN (₦ - Naira)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-valuation" className="text-xs font-semibold">Inventory Valuation</Label>
                    <Input id="edit-valuation" type="number" value={valuation} onChange={e => setValuation(e.target.value)} className="text-xs h-8.5 font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-country" className="text-xs font-semibold">Country</Label>
                    <select id="edit-country" value={storeCountry} onChange={e => {
                      setStoreCountry(e.target.value);
                      if (e.target.value !== "Nigeria") {
                        setStoreState("");
                        setStoreLga("");
                      }
                    }} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                      <option value="Nigeria">Nigeria 🇳🇬</option>
                      <option value="Other">Other Global Location</option>
                    </select>
                  </div>
                  {storeCountry === "Nigeria" ? (
                    <div className="space-y-1">
                      <Label htmlFor="edit-state" className="text-xs font-semibold">State</Label>
                      <select id="edit-state" value={storeState} onChange={e => setStoreState(e.target.value)} className="w-full h-8.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-2xs focus:outline-none font-medium">
                        <option value="">-- State --</option>
                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label htmlFor="edit-state" className="text-xs font-semibold">State / Region</Label>
                      <Input id="edit-state" value={storeState} onChange={e => setStoreState(e.target.value)} placeholder="e.g. California" className="text-xs h-8.5" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-lga" className="text-xs font-semibold">
                    {storeCountry === "Nigeria" ? "LGA (Local Govt Area)" : "County / District"}
                  </Label>
                  <Input id="edit-lga" value={storeLga} onChange={e => setStoreLga(e.target.value)} placeholder={storeCountry === "Nigeria" ? "e.g. Ikeja" : "e.g. Orange County"} className="text-xs h-8.5" />
                </div>
              </div>
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

      {/* View Storefront Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Storefront Parameters
            </DialogTitle>
            <DialogDescription>
              Detailed multi-tenant environment specifications for this branch.
            </DialogDescription>
          </DialogHeader>
          {viewingStore && (
            <div className="space-y-4 text-xs py-2">
              <div className="grid grid-cols-2 gap-3 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <div>
                  <span className="text-muted-foreground block font-medium">Branch ID</span>
                  <span className="font-mono font-bold select-all">{viewingStore.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Status</span>
                  <Badge className={`mt-0.5 font-bold text-[10px] uppercase ${
                    viewingStore.status === "active" ? "bg-emerald-500/10 text-emerald-500" :
                    viewingStore.status === "maintenance" ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                  }`}>
                    {viewingStore.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Vertical / Sector</span>
                  <span className="font-semibold">{SECTOR_LABELS[viewingStore.sector] || viewingStore.sector}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Valuation</span>
                  <span className="font-semibold text-foreground font-mono">₦{viewingStore.valuationNgn.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Total Items</span>
                  <span className="font-semibold font-mono">{viewingStore.itemCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">Health Score</span>
                  <span className="font-semibold font-mono">{viewingStore.healthScore}%</span>
                </div>
              </div>

              <div className="space-y-2 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <h4 className="font-semibold text-foreground border-b border-muted-foreground/10 pb-1">Geographic Location</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block">Country</span>
                    <span className="font-medium">{viewingStore.country || "Nigeria"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">State</span>
                    <span className="font-medium">{viewingStore.state || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">LGA</span>
                    <span className="font-medium">{viewingStore.lga || "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border border-muted-foreground/10 rounded-md p-3 bg-muted/20">
                <h4 className="font-semibold text-foreground border-b border-muted-foreground/10 pb-1">Branch Manager context</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block">Manager Name</span>
                    <span className="font-medium">{viewingStore.manager}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Email context</span>
                    <span className="font-mono">{viewingStore.managerEmail}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setIsViewOpen(false)} className="text-xs h-9">
                  Close Window
                </Button>
                <Button 
                  type="button" 
                  onClick={() => {
                    setCurrentStoreId(viewingStore.id);
                    setIsViewOpen(false);
                    toast.success(`Now impersonating "${viewingStore.name}"`);
                  }}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex gap-1.5"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  Impersonate Location
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Storefront Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-sans text-red-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Terminate & Delete Storefront
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is destructive. Deleting a branch storefront terminates its containerized multitenant DB slice and all corresponding inventory data.
            </DialogDescription>
          </DialogHeader>
          {deletingStore && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-md text-red-500/90 font-medium">
                Are you absolutely sure you want to delete <span className="font-bold underline">"{deletingStore.name}"</span>?
                This operation cannot be undone.
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting} className="text-xs h-9">
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => handleDeleteStore(deletingStore)}
                  className="text-xs h-9 bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Terminating...</span>
                    </>
                  ) : (
                    <span>Terminate Container Slice</span>
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
