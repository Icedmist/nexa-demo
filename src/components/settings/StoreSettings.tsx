import { useState, useEffect, useMemo } from "react";
import { Store, Save, ShieldAlert, Mail, FileText, MapPin, Trash2, Plus, Building2, ExternalLink, Copy, Sparkles, Layers, ShieldCheck, Zap, ArrowUpRight, Eye, EyeOff, Landmark, HelpCircle } from "lucide-react";
import { PaymentDialog } from "@/components/settings/PaymentDialog";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useDemo } from "@/hooks/useDemo";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/contexts/AuthContext";
import { CURRENCIES, useCurrency } from "@/hooks/useCurrency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { collection, getDocs, query, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLocations, useSales, useItems } from "@/hooks/useInventoryData";
import { useCreateLocation, useDeleteLocation } from "@/hooks/useInventoryMutations";
import { cn } from "@/lib/utils";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
  "Taraba", "Yobe", "Zamfara"
];

export function StoreSettings() {
  const { isDemo, onboarding: demoOnboarding, updateOnboarding, demoStore } = useDemo();
  const { settings: liveSettings, updateSettings } = useSystemSettings();
  const { flags } = useFeatureFlags();
  const { profile } = useAuth();
  const { formatCurrency } = useCurrency();

  const { data: sales } = useSales();
  const { data: items } = useItems();
  const { data: locations } = useLocations();

  const createLoc = useCreateLocation();
  const deleteLoc = useDeleteLocation();

  const activeSettings = isDemo ? demoOnboarding : liveSettings;

  const [storeName, setStoreName] = useState(activeSettings.storeName || "");
  const [phone, setPhone] = useState(activeSettings.storePhone || "");
  const [address, setAddress] = useState(activeSettings.storeAddress || "");
  const [storeDescription, setStoreDescription] = useState(activeSettings.storeDescription || "");
  const [receiptFooter, setReceiptFooter] = useState(activeSettings.receiptFooter || "");
  const [taxRate, setTaxRate] = useState(activeSettings.taxRate?.toString() || "0");
  const [moniepointKey, setMoniepointKey] = useState(activeSettings.moniepointKey || "");
  const [moniepointAccountNumber, setMoniepointAccountNumber] = useState(activeSettings.moniepointAccountNumber || "");
  const [moniepointAccountName, setMoniepointAccountName] = useState(activeSettings.moniepointAccountName || "");
  const [moniepointBankName, setMoniepointBankName] = useState(activeSettings.moniepointBankName || "Moniepoint Microfinance Bank");
  const [showMoniepointKey, setShowMoniepointKey] = useState(false);
  const [showMoniepointGuide, setShowMoniepointGuide] = useState(false);

  // Monnify Gateway & Virtual Account Setup
  const [monnifyApiKey, setMonnifyApiKey] = useState(activeSettings.monnifyApiKey || "");
  const [monnifySecretKey, setMonnifySecretKey] = useState(activeSettings.monnifySecretKey || "");
  const [monnifyContractCode, setMonnifyContractCode] = useState(activeSettings.monnifyContractCode || "");
  const [monnifyAccountNumber, setMonnifyAccountNumber] = useState(activeSettings.monnifyAccountNumber || "5028910423");
  const [monnifyAccountName, setMonnifyAccountName] = useState(activeSettings.monnifyAccountName || "NexaStoreOS / Monnify Gateway");
  const [monnifyBankName, setMonnifyBankName] = useState(activeSettings.monnifyBankName || "Moniepoint MFB (Monnify Gateway)");
  const [showMonnifyApiKey, setShowMonnifyApiKey] = useState(false);
  const [showMonnifySecretKey, setShowMonnifySecretKey] = useState(false);
  const [storeSlug, setStoreSlug] = useState(activeSettings.storeSlug || "");
  const [pricingMode, setPricingMode] = useState<"single" | "tiered">(activeSettings.pricingMode || "single");
  const [currency, setCurrency] = useState(activeSettings.currency || "NGN");
  const [country, setCountry] = useState(activeSettings.country || "Nigeria");
  const [state, setState] = useState(activeSettings.state || "");
  const [lga, setLga] = useState(activeSettings.lga || "");

  // New Storefront & Branch Management local state
  const [publicStorefrontEnabled, setPublicStorefrontEnabled] = useState<boolean>(
    (activeSettings as Record<string, unknown>).publicStorefrontEnabled as boolean || false
  );
  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");

  const [reportFrequency, setReportFrequency] = useState<"daily" | "weekly" | "monthly" | "off">(
    activeSettings.reportPreferences?.frequency || "off"
  );
  const [recipientEmail, setRecipientEmail] = useState(
    activeSettings.reportPreferences?.recipientEmail || ""
  );

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTier, setUpgradeTier] = useState<"starter" | "professional" | "enterprise">("professional");

  useEffect(() => {
    setStoreName(activeSettings.storeName || "");
    setPhone(activeSettings.storePhone || "");
    setAddress(activeSettings.storeAddress || "");
    setStoreDescription(activeSettings.storeDescription || "");
    setReceiptFooter(activeSettings.receiptFooter || "");
    setTaxRate(activeSettings.taxRate?.toString() || "0");
    setMoniepointKey(activeSettings.moniepointKey || "");
    setMoniepointAccountNumber(activeSettings.moniepointAccountNumber || "");
    setMoniepointAccountName(activeSettings.moniepointAccountName || "");
    setMoniepointBankName(activeSettings.moniepointBankName || "Moniepoint Microfinance Bank");
    setMonnifyApiKey(activeSettings.monnifyApiKey || "");
    setMonnifySecretKey(activeSettings.monnifySecretKey || "");
    setMonnifyContractCode(activeSettings.monnifyContractCode || "");
    setMonnifyAccountNumber(activeSettings.monnifyAccountNumber || "5028910423");
    setMonnifyAccountName(activeSettings.monnifyAccountName || "NexaStoreOS / Monnify Gateway");
    setMonnifyBankName(activeSettings.monnifyBankName || "Moniepoint MFB (Monnify Gateway)");
    setStoreSlug(activeSettings.storeSlug || "");
    setPricingMode(activeSettings.pricingMode || "single");
    setCurrency(activeSettings.currency || "NGN");
    setCountry(activeSettings.country || "Nigeria");
    setState(activeSettings.state || "");
    setLga(activeSettings.lga || "");
    setReportFrequency(activeSettings.reportPreferences?.frequency || "off");
    setRecipientEmail(activeSettings.reportPreferences?.recipientEmail || "");
    setPublicStorefrontEnabled((activeSettings as Record<string, unknown>).publicStorefrontEnabled as boolean || false);
  }, [activeSettings]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalNgn || 0), 0);
  const branches = locations.filter(l => l.parentId === null && l.type === "warehouse");

  const weeklyEmailDigestEnabled = useMemo(() => {
    if (flags.planId === "starter") return false;
    try {
      const saved = localStorage.getItem("nexa_smart_features");
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.weeklyEmailDigest;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  }, [flags.planId]);

  const handleCopyUrl = () => {
    const storeIdStr = profile?.storeId || "demo-store";
    const url = `${window.location.origin}/?storeId=${storeIdStr}`;
    navigator.clipboard.writeText(url);
    toast.success("Store login link copied!");
  };

  const handleSaveStorefront = async () => {
    try {
      if (isDemo) {
        updateOnboarding({ ...activeSettings, publicStorefrontEnabled });
      } else {
        await updateSettings({ publicStorefrontEnabled });
      }
      toast.success("Storefront settings saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save storefront settings.");
    }
  };

  const handleAddBranch = () => {
    if (!branchName.trim()) {
      toast.error("Branch name is required");
      return;
    }
    const now = new Date().toISOString();
    createLoc.mutate({
      id: crypto.randomUUID(),
      name: branchName.trim(),
      type: "warehouse",
      parentId: null,
      description: "Store Branch",
      address: branchAddress.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }, {
      onSuccess: () => {
        toast.success(`Branch "${branchName.trim()}" added successfully!`);
        setBranchName("");
        setBranchAddress("");
      },
      onError: (err) => {
        toast.error(err.message || "Failed to add branch.");
      }
    });
  };

  const handleDeleteBranch = (id: string, name: string) => {
    // Check if there are items or people assigned
    deleteLoc.mutate(id, {
      onSuccess: () => {
        toast.success(`Branch "${name}" deleted successfully!`);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete branch. Check if items are assigned first.");
      }
    });
  };

  const handleSave = async () => {
    if (pricingMode === "tiered" && !flags.pricingMode) {
      toast.error(`Subscription Limit: Multi-tier pricing mode is gated. Please upgrade from your current ${flags.planName} to unlock premium billing tiers!`);
      return;
    }

    if (reportFrequency === "daily" && flags.planId === "starter") {
      toast.error(`Subscription Limit: Daily PDF business reports are gated. Please upgrade from your current ${flags.planName} to unlock daily automated reporting!`);
      return;
    }

    const oldPricingMode = activeSettings.pricingMode || "single";
    const data = {
      storeName: storeName.trim(),
      storePhone: phone.trim(),
      storeAddress: address.trim(),
      storeDescription: storeDescription.trim(),
      receiptFooter: receiptFooter.trim(),
      taxRate: parseFloat(taxRate) || 0,
      moniepointKey: moniepointKey.trim(),
      moniepointAccountNumber: moniepointAccountNumber.trim(),
      moniepointAccountName: moniepointAccountName.trim(),
      moniepointBankName: moniepointBankName.trim() || "Moniepoint Microfinance Bank",
      monnifyApiKey: monnifyApiKey.trim(),
      monnifySecretKey: monnifySecretKey.trim(),
      monnifyContractCode: monnifyContractCode.trim(),
      monnifyAccountNumber: monnifyAccountNumber.trim(),
      monnifyAccountName: monnifyAccountName.trim(),
      monnifyBankName: monnifyBankName.trim() || "Moniepoint MFB (Monnify Gateway)",
      monnifyStatus: (monnifyApiKey.trim() && monnifySecretKey.trim()) ? "active" : "waiting_for_keys",
      storeSlug: storeSlug.trim(),
      pricingMode: pricingMode,
      currency: currency,
      reportPreferences: {
        frequency: reportFrequency,
        recipientEmail: recipientEmail.trim(),
        lastSentAt: activeSettings.reportPreferences?.lastSentAt || ""
      },
      country: country,
      state: state,
      lga: lga,
    };

    try {
      if (isDemo) {
        updateOnboarding(data);
        if (oldPricingMode !== "tiered" && pricingMode === "tiered" && demoStore) {
          const items = demoStore.getItems();
          items.forEach(item => {
            if (!item.pricingTiers || !item.pricingTiers.retail) {
              demoStore.updateItem(item.id, {
                pricingTiers: {
                  ...(item.pricingTiers || {}),
                  retail: item.sellingPrice,
                  tierEnabled: true
                }
              });
            }
          });
          toast.success("Successfully migrated demo item prices to retail pricing tier");
        }
      } else {
        await updateSettings(data);
        if (oldPricingMode !== "tiered" && pricingMode === "tiered" && liveSettings) {
          const itemsRef = collection(db, "items");
          const q = query(itemsRef, where("storeId", "==", profile?.storeId || ""));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            let hasChanges = false;
            snapshot.docs.forEach((itemDoc) => {
              const itemData = itemDoc.data();
              if (!itemData.pricingTiers || !itemData.pricingTiers.retail) {
                const existingPrice = itemData.sellingPrice || 0;
                batch.update(itemDoc.ref, {
                  pricingTiers: {
                    ...(itemData.pricingTiers || {}),
                    retail: existingPrice,
                    tierEnabled: true
                  }
                });
                hasChanges = true;
              }
            });
            if (hasChanges) {
              await batch.commit();
              toast.success("Successfully migrated existing item prices to retail pricing tier");
            }
          }
        }
      }
      toast.success("Store settings saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Subscription & Upgrade Card */}
      <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/20 via-background to-purple-950/20 shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Zap className="h-32 w-32 text-indigo-500" />
        </div>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Current Plan
                </span>
                <span className="text-xs font-semibold uppercase text-emerald-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {flags.planName}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Manage your subscription tier, unlock branch expansions, and access Enterprise AI tools.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {flags.planId !== "professional" && flags.planId !== "enterprise" && (
                <Button
                  size="sm"
                  onClick={() => {
                    setUpgradeTier("professional");
                    setShowUpgradeModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
                  id="upgrade-pro-btn"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Upgrade to Pro
                </Button>
              )}

              {flags.planId !== "enterprise" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUpgradeTier("enterprise");
                    setShowUpgradeModal(true);
                  }}
                  className="border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-400 font-semibold text-xs gap-1.5"
                  id="upgrade-enterprise-btn"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" /> Upgrade to Enterprise
                </Button>
              )}

              <Link
                to="/app/settings"
                search={{ tab: "subscription" }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground underline flex items-center gap-1 px-2 py-1"
              >
                Compare Plans <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border/40 pt-3">
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-medium">Branch Locations</span>
              <span className="font-semibold text-foreground">Up to {flags.maxBranches} Location{flags.maxBranches > 1 ? "s" : ""}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-medium">Enterprise AI Assistant</span>
              <span className={`font-semibold ${flags.aiAssistant ? "text-emerald-400" : "text-amber-400"}`}>
                {flags.aiAssistant ? "Included" : "Gated (Enterprise)"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-medium">Multi-Tier Pricing</span>
              <span className={`font-semibold ${flags.pricingMode ? "text-emerald-400" : "text-muted-foreground"}`}>
                {flags.pricingMode ? "Unlocked" : "Single Tier"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-medium">Auto-Replenishment</span>
              <span className={`font-semibold ${flags.aiReplenishment ? "text-emerald-400" : "text-muted-foreground"}`}>
                {flags.aiReplenishment ? "Active" : "Pro / Enterprise"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <PaymentDialog
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        targetTier={upgradeTier}
        onSuccess={() => {
          setShowUpgradeModal(false);
          toast.success("Subscription updated! Your new plan features are active.");
        }}
      />

      {/* Performance Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Performance</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="bg-emerald-950/20 border-emerald-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Total Revenue</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-emerald-500">{formatCurrency(totalRevenue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-blue-950/20 border-blue-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Sales Recorded</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-blue-500">{sales.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-amber-950/20 border-amber-500/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase font-semibold tracking-wider text-muted-foreground">Catalog Items</CardDescription>
              <CardTitle className="text-2xl font-bold font-mono text-amber-500">{items.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Share Shop Login URL Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Building2 className="h-4 w-4 text-emerald-500" /> Shop Login URL
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Share this link with your staff to login directly to this store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 bg-muted/60 px-3 py-2 rounded-lg border text-sm font-mono flex items-center justify-between text-muted-foreground select-all truncate">
              <span>{window.location.origin}/?storeId={profile?.storeId || "demo-store"}</span>
            </div>
            <Button size="sm" onClick={handleCopyUrl} className="gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Copy className="h-3.5 w-3.5" /> Copy Link
            </Button>
          </div>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mt-2">
            Staff access this URL to login directly to {storeName || "Unauthorised"}.
          </p>
        </CardContent>
      </Card>

      {/* Public Storefront Settings */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <ExternalLink className="h-4 w-4 text-emerald-500" /> Public Storefront Settings
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Configure your store's public page and bank details for online orders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold">Enable Public Storefront</h4>
              <p className="text-xs text-muted-foreground">Make your store and active products viewable to the public.</p>
            </div>
            <button
              type="button"
              onClick={() => setPublicStorefrontEnabled(!publicStorefrontEnabled)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                publicStorefrontEnabled ? "bg-emerald-600" : "bg-input"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                  publicStorefrontEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <Button size="sm" onClick={handleSaveStorefront} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className="h-3.5 w-3.5" /> Save Storefront Settings
          </Button>
        </CardContent>
      </Card>

      {/* Branch Management */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
            <Building2 className="h-4 w-4 text-emerald-500" /> Branch Management
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wide">
            Define locations for your store staff and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branch Name</Label>
              <Input
                id="branch-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Lekki Phase 1"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-address" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location / Address</Label>
              <Input
                id="branch-address"
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="e.g. Plot 12, Lagos"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAddBranch} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4" /> Add Branch
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Existing Branches</h4>
            {branches.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/10 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No branches defined yet.</span>
                <span className="text-xs text-muted-foreground mt-1">Add branches above to associate staff and inventory locations.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors shadow-2xs">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{b.name}</p>
                      {b.address && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" /> {b.address}
                        </p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteBranch(b.id, b.name)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Store Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-4 w-4" />Store Information</CardTitle>
          <CardDescription>Your store details appear on receipts and invoices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="My Store" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone Number</Label>
              <Input id="store-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-address">Address</Label>
            <Textarea id="store-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main Street, Lagos" rows={2} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="store-country">Country</Label>
              <select
                id="store-country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  if (e.target.value !== "Nigeria") {
                    setState("");
                    setLga("");
                  }
                }}
                className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="Nigeria">Nigeria 🇳🇬</option>
                <option value="Other">Other Country</option>
              </select>
            </div>
            {country === "Nigeria" ? (
              <div className="space-y-2">
                <Label htmlFor="store-state">State</Label>
                <select
                  id="store-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">-- Select State --</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="store-state">State / Region</Label>
                <Input
                  id="store-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. California"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="store-lga">
                {country === "Nigeria" ? "LGA (Local Govt)" : "County / District"}
              </Label>
              <Input
                id="store-lga"
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder={country === "Nigeria" ? "e.g. Ikeja" : "e.g. Orange County"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-description">Detailed Description of Store</Label>
            <Textarea id="store-description" value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} placeholder="Describe your store, specializing branches, trading hours, general notes..." rows={3} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input id="tax-rate" type="number" min="0" max="100" step="0.5" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt-footer">Receipt Footer Text</Label>
              <Input id="receipt-footer" value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} placeholder="Thank you for your patronage!" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-currency">Store Currency</Label>
              <select
                id="store-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2 max-w-md pt-2">
            <Label htmlFor="pricing-mode" className="flex items-center gap-1.5 font-semibold text-xs">
              Pricing Mode Settings
              {!flags.pricingMode && <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">🔒 PRO+</span>}
            </Label>
            <select
              id="pricing-mode"
              value={flags.pricingMode ? pricingMode : "single"}
              disabled={!flags.pricingMode}
              onChange={(e) => setPricingMode(e.target.value as "single" | "tiered")}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              <option value="single">Single Pricing Model (Standard)</option>
              {flags.pricingMode ? (
                <option value="tiered">Three-Tier Pricing Model (Retail, Wholesale, Distributor)</option>
              ) : (
                <option value="single" disabled>Three-Tier Pricing Model (🔒 Professional & Enterprise Only)</option>
              )}
            </select>
            {!flags.pricingMode ? (
              <p className="text-xs text-sky-600 font-medium flex items-center gap-1.5 mt-1 bg-sky-500/5 p-2 rounded-lg border border-sky-500/10">
                <ShieldAlert className="h-3.5 w-3.5" /> Gated: Tiered pricing is locked under your current {flags.planName}. Upgrade to Professional to unlock custom retail, wholesale, and distributor prices.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enable this to configure Retail, Wholesale, and Distributor pricing on your products.
              </p>
            )}
          </div>

          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center justify-between">
                <span>Online Storefront & Moniepoint Gateway</span>
                {flags.planId === "starter" ? (
                  <Badge className="bg-amber-500 text-amber-950 text-[10px] font-extrabold uppercase">Pro & Enterprise Only</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold">
                    Pro / Enterprise Unlocked
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">Configure public store URL, Moniepoint API key, and checkout bank transfer details.</p>
            </div>

            {flags.planId === "starter" ? (
              <div className="bg-gradient-to-br from-amber-500/5 via-primary/5 to-muted border border-amber-500/20 rounded-xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground">
                      Moniepoint Gateway & Storefront Integration Gated
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Moniepoint automated API transfer verification, custom bank account checkout details, and dynamic Shop QR code flyers are available exclusively on Professional and Enterprise plans.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-500/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    Upgrade your plan to accept Moniepoint instant transfers & generate Shop QR flyers.
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setUpgradeTier("professional");
                      setShowUpgradeModal(true);
                    }}
                    className="gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Upgrade Plan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-slug">Custom Store URL</Label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-md text-xs text-muted-foreground whitespace-nowrap">nexa.store/</span>
                    <Input 
                      id="store-slug" 
                      value={storeSlug} 
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"))} 
                      placeholder="adebayo-tech"
                      className="rounded-l-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="moniepoint-key">Moniepoint API Key</Label>
                    <button
                      type="button"
                      onClick={() => setShowMoniepointGuide(true)}
                      className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <HelpCircle className="h-3 w-3" /> API Key Guide
                    </button>
                  </div>
                  <div className="relative">
                    <Input 
                      id="moniepoint-key" 
                      type={showMoniepointKey ? "text" : "password"} 
                      value={moniepointKey} 
                      onChange={(e) => setMoniepointKey(e.target.value)} 
                      placeholder="sk_live_..."
                      className="pr-10 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMoniepointKey(!showMoniepointKey)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                      aria-label={showMoniepointKey ? "Hide API key" : "Show API key"}
                    >
                      {showMoniepointKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moniepoint-account-no">Moniepoint Account Number</Label>
                  <Input 
                    id="moniepoint-account-no" 
                    value={moniepointAccountNumber} 
                    onChange={(e) => setMoniepointAccountNumber(e.target.value.replace(/[^0-9]/g, ""))} 
                    placeholder="e.g. 8132119637"
                    maxLength={10}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moniepoint-account-name">Moniepoint Account Name</Label>
                  <Input 
                    id="moniepoint-account-name" 
                    value={moniepointAccountName} 
                    onChange={(e) => setMoniepointAccountName(e.target.value)} 
                    placeholder="e.g. Adebayo Enterprise Ltd"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="moniepoint-bank-name">Moniepoint Bank Name</Label>
                  <Input 
                    id="moniepoint-bank-name" 
                    value={moniepointBankName} 
                    onChange={(e) => setMoniepointBankName(e.target.value)} 
                    placeholder="e.g. Moniepoint Microfinance Bank"
                    className="text-xs"
                  />
                </div>

                {/* Monnify Gateway & Virtual Account Configuration Card */}
                <div className="sm:col-span-2 mt-4 p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/60 border border-indigo-500/30 space-y-4 text-white shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-bold tracking-wider">
                          Monnify Gateway Engine
                        </Badge>
                        {(!monnifyApiKey || !monnifySecretKey) ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                            <Clock className="h-3 w-3" /> Waiting for API Setup & Keys
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Monnify Gateway Active
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">Monnify Account Setup & Virtual Account Settlement</h4>
                      <p className="text-xs text-slate-300">
                        Collect automated bank transfer payments, generate dynamic POS customer accounts, and receive real-time webhook notifications via Monnify.
                      </p>
                    </div>
                  </div>

                  {(!monnifyApiKey || !monnifySecretKey) && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-amber-300">Monnify Key Exchange Required</span>
                        Your Monnify virtual account gateway is initialized. Once Monnify issues your production API Key, Secret Key, and Contract Code, enter them below to enable automated 2-second bank transfer verification.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-200">
                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-api-key" className="text-xs font-semibold text-slate-200">
                        Monnify API Key (MK_PROD_...)
                      </Label>
                      <div className="relative">
                        <Input
                          id="monnify-api-key"
                          type={showMonnifyApiKey ? "text" : "password"}
                          value={monnifyApiKey}
                          onChange={(e) => setMonnifyApiKey(e.target.value)}
                          placeholder="MK_PROD_..."
                          className="bg-black/40 border-white/10 text-white font-mono text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMonnifyApiKey(!showMonnifyApiKey)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showMonnifyApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-secret-key" className="text-xs font-semibold text-slate-200">
                        Monnify Secret Key (SK_PROD_...)
                      </Label>
                      <div className="relative">
                        <Input
                          id="monnify-secret-key"
                          type={showMonnifySecretKey ? "text" : "password"}
                          value={monnifySecretKey}
                          onChange={(e) => setMonnifySecretKey(e.target.value)}
                          placeholder="SK_PROD_..."
                          className="bg-black/40 border-white/10 text-white font-mono text-xs pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMonnifySecretKey(!showMonnifySecretKey)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                        >
                          {showMonnifySecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-contract-code" className="text-xs font-semibold text-slate-200">
                        Monnify Contract Code
                      </Label>
                      <Input
                        id="monnify-contract-code"
                        value={monnifyContractCode}
                        onChange={(e) => setMonnifyContractCode(e.target.value)}
                        placeholder="e.g. 8923415609"
                        className="bg-black/40 border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-account-number" className="text-xs font-semibold text-slate-200">
                        Monnify Dedicated Virtual Account
                      </Label>
                      <Input
                        id="monnify-account-number"
                        value={monnifyAccountNumber}
                        onChange={(e) => setMonnifyAccountNumber(e.target.value)}
                        placeholder="5028910423"
                        className="bg-black/40 border-white/10 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-account-name" className="text-xs font-semibold text-slate-200">
                        Monnify Account Beneficiary Name
                      </Label>
                      <Input
                        id="monnify-account-name"
                        value={monnifyAccountName}
                        onChange={(e) => setMonnifyAccountName(e.target.value)}
                        placeholder="NexaStoreOS / Monnify Gateway"
                        className="bg-black/40 border-white/10 text-white text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="monnify-bank-name" className="text-xs font-semibold text-slate-200">
                        Settlement Bank
                      </Label>
                      <Input
                        id="monnify-bank-name"
                        value={monnifyBankName}
                        onChange={(e) => setMonnifyBankName(e.target.value)}
                        placeholder="Moniepoint MFB (Monnify Gateway)"
                        className="bg-black/40 border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 pt-4 border-t border-border">
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-1.5"><FileText className="h-4 w-4 text-blue-500" />Automated PDF Business Reports</h3>
              <p className="text-xs text-muted-foreground">Receive regular branded email PDF summaries of your sales, stock, and business analytics.</p>
            </div>

            {!weeklyEmailDigestEnabled ? (
              <div className="bg-purple-500/[0.01] border border-purple-500/10 rounded-xl p-6 text-center space-y-3">
                <Mail className="h-8 w-8 text-purple-500/80 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-foreground">Email Digest Smart Feature Required</h4>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {flags.planId === "starter" 
                      ? "Automated PDF digests are available on Professional and Enterprise plans. Please upgrade your plan." 
                      : "Please activate 'Automated Daily Email Digest' in your Smart Features console to configure report schedules."}
                  </p>
                </div>
                {flags.planId !== "starter" && (
                  <Button size="sm" variant="outline" className="text-xs border-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/5 h-8 font-semibold" asChild>
                    <Link to="/app/settings">Activate Smart Feature</Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report-frequency" className="flex items-center gap-1">
                      Report Frequency
                      {flags.planId === "starter" && (
                        <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1">🔒 PRO+ GATED DAILY</span>
                      )}
                    </Label>
                    <select
                      id="report-frequency"
                      value={reportFrequency}
                      onChange={(e) => setReportFrequency(e.target.value as "daily" | "weekly" | "monthly" | "off")}
                      className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="off">Disabled (No reports)</option>
                      <option value="monthly">Monthly Summary</option>
                      <option value="weekly">Weekly Summary</option>
                      <option value="daily font-semibold">Daily Summary (Professional / Enterprise)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient-email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> Recipient Email</Label>
                    <Input
                      id="recipient-email"
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="recipient@example.com"
                    />
                  </div>
                </div>
                
                {flags.planId === "starter" && reportFrequency === "daily" && (
                  <p className="text-xs text-sky-600 font-medium flex items-center gap-1.5 mt-1 bg-sky-500/5 p-3 rounded-lg border border-sky-500/10">
                    <ShieldAlert className="h-4 w-4" /> <span><strong>Gated:</strong> Daily report frequency is a premium feature. Please upgrade your current Starter Plan to Professional or Enterprise to unlock daily automated reports.</span>
                  </p>
                )}
                
                {reportFrequency !== "off" && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
                    ✨ Reports are generated automatically and sent from <strong>nexatechnologies.dev@gmail.com</strong> with your store branding at the top and a secure animated-GIF logo signature.
                  </p>
                )}
              </>
            )}
          </div>

          <Button onClick={handleSave} className="gap-1.5">
            <Save className="h-4 w-4" /> Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* ── Moniepoint API Key Setup Guide Dialog ── */}
      <Dialog open={showMoniepointGuide} onOpenChange={setShowMoniepointGuide}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                <Landmark className="h-5 w-5" />
              </div>
              How to Get Your Moniepoint API Key
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Follow these simple steps to retrieve your API Secret Key from the Moniepoint app or web dashboard:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="flex gap-3 items-start p-3 bg-muted/40 rounded-xl border border-border">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
              <div>
                <p className="font-bold text-foreground">Open Moniepoint Web or App</p>
                <p className="text-muted-foreground mt-0.5">Log in to your Moniepoint POS / Business Mobile App or visit <a href="https://moniepoint.com" target="_blank" rel="noopener noreferrer" className="text-primary underline font-bold">moniepoint.com</a> on your browser.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-muted/40 rounded-xl border border-border">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
              <div>
                <p className="font-bold text-foreground">Navigate to Settings & Developer Tools</p>
                <p className="text-muted-foreground mt-0.5">Tap or click <strong>Settings</strong> $\rightarrow$ <strong>Developer Tools / API Keys</strong> (or <strong>Online Payments & Webhooks</strong>).</p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-muted/40 rounded-xl border border-border">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
              <div>
                <p className="font-bold text-foreground">Generate or Copy Live Secret Key</p>
                <p className="text-muted-foreground mt-0.5">Click <strong>"Generate API Key"</strong> or copy your existing secret key (starting with <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-primary">sk_live_...</code>).</p>
              </div>
            </div>

            <div className="flex gap-3 items-start p-3 bg-muted/40 rounded-xl border border-border">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
              <div>
                <p className="font-bold text-foreground">Paste & Save in NexaStoreOS</p>
                <p className="text-muted-foreground mt-0.5">Paste the key into the <strong>Moniepoint API Key</strong> field, fill in your Moniepoint Account Number & Name, and click <strong>Save Settings</strong>.</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open("https://moniepoint.com", "_blank")}
              className="gap-1.5 text-xs font-bold"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Moniepoint
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowMoniepointGuide(false)}
              className="text-xs font-bold"
            >
              Got It, Thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
