import { useState } from "react";
import { 
  Globe, 
  MessageCircle, 
  Link as LinkIcon, 
  Landmark, 
  Eye, 
  ShoppingCart, 
  ArrowUpRight, 
  QrCode, 
  Copy, 
  Check, 
  Sparkles, 
  Share2, 
  TrendingUp, 
  Zap, 
  Printer,
  CreditCard,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { getStorefrontUrl, getCleanStoreSlug } from "@/lib/utils";
import { InStoreQrModal } from "@/components/store/InStoreQrModal";
import { toast } from "sonner";

export function SocialCommerceDashboard() {
  const { settings } = useSystemSettings();
  const [inStoreQrOpen, setInStoreQrOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState<"catalog" | "new" | "discount">("catalog");
  const [customMsg, setCustomMsg] = useState("");
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  const cleanSlug = getCleanStoreSlug(settings.storeSlug, settings.storeName);
  const fullStoreUrl = getStorefrontUrl(cleanSlug);
  const bankName = settings.moniepointBankName || "Moniepoint Microfinance Bank";
  const accountNumber = settings.moniepointAccountNumber || "5028910423";
  const accountName = settings.moniepointAccountName || `${settings.storeName || "Nexa Store"} Main Operations`;

  // WhatsApp Broadcast Templates
  const templates = {
    catalog: `👋 Hello! Welcome to *${settings.storeName || "our store"}*!\n\nBrowse our full catalog, view prices, and order online here:\n👉 ${fullStoreUrl}\n\nFast delivery & instant bank transfer accepted!`,
    new: `🔥 *NEW ARRIVALS ALERT* at *${settings.storeName || "our store"}*!\n\nWe've just updated our stock with fresh items. Check them out before they sell out:\n👉 ${fullStoreUrl}`,
    discount: `⚡ *SPECIAL PROMO DISCOUNT* at *${settings.storeName || "our store"}*!\n\nGet exclusive deals on selected items today:\n👉 ${fullStoreUrl}\n\nOrder directly on our catalog or send us a message!`
  };

  const activeMsgText = customMsg.trim() || templates[selectedTemplate];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullStoreUrl);
    setCopiedLink(true);
    toast.success("Storefront catalog link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyAccount = () => {
    const text = `🏦 *Payment Account Details*\nBank: ${bankName}\nAccount No: ${accountNumber}\nAccount Name: ${accountName}`;
    navigator.clipboard.writeText(text);
    setCopiedAcc(true);
    toast.success("Payment details copied for DM response!");
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(activeMsgText)}`;
    window.open(waUrl, "_blank");
  };

  const handleCopyBroadcast = () => {
    navigator.clipboard.writeText(activeMsgText);
    setCopiedBroadcast(true);
    toast.success("Broadcast message copied!");
    setTimeout(() => setCopiedBroadcast(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner for Online Vendor ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-teal-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Online Vendor Suite Active
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {settings.storeName || "Your Digital Store"} Catalog Hub
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sell directly on WhatsApp, Instagram, and TikTok with an automated digital catalog, in-store table QR flyers, and instant Moniepoint bank transfer checkout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setInStoreQrOpen(true)}
            className="h-10 text-xs font-bold gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg shadow-teal-500/20 rounded-xl"
          >
            <QrCode className="h-4 w-4" /> In-Store Table QR
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="h-10 text-xs font-bold gap-1.5 border-slate-700 bg-slate-800/80 text-white hover:bg-slate-800 rounded-xl"
          >
            {copiedLink ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? "Copied Link" : "Copy Store Link"}
          </Button>
          <Button
            variant="secondary"
            asChild
            className="h-10 text-xs font-bold gap-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100"
          >
            <a href={fullStoreUrl} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4 text-teal-600" /> View Storefront
            </a>
          </Button>
        </div>
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Performance, Payment DM Card & WhatsApp Studio */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 border-border/80 bg-card rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Storefront Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-extrabold text-foreground">Live Webshop</p>
              </div>
            </Card>

            <Card className="p-4 border-border/80 bg-card rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gateway Status</p>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                Moniepoint MFB
              </p>
            </Card>

            <Card className="p-4 border-border/80 bg-card rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Checkout Speed</p>
              <p className="text-sm font-extrabold text-foreground mt-1">Instant Direct</p>
            </Card>

            <Card className="p-4 border-border/80 bg-card rounded-xl shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Table QR Support</p>
              <p className="text-sm font-extrabold text-teal-600 dark:text-teal-400 mt-1">Enabled</p>
            </Card>
          </div>

          {/* DM Customer Quick Payment Copy Card */}
          <Card className="border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">1-Click DM Bank Details Copy</CardTitle>
                    <CardDescription className="text-xs">
                      Send this to buyers asking for account details on WhatsApp or Instagram DMs.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={handleCopyAccount}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-lg"
                >
                  {copiedAcc ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedAcc ? "Copied DM Text" : "Copy DM Payment Card"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Bank Name</span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block truncate">{bankName}</span>
                </div>
                <div className="p-3 bg-card border border-emerald-500/30 rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Account Number</span>
                  <span className="text-sm font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{accountNumber}</span>
                </div>
                <div className="p-3 bg-card border border-border rounded-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Account Name</span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block truncate">{accountName}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Marketing & Broadcast Template Studio */}
          <Card className="border border-border/80 bg-card rounded-2xl shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">WhatsApp & Status Broadcast Studio</CardTitle>
                    <CardDescription className="text-xs">
                      Generate promotional messages with your catalog link to boost social sales.
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={selectedTemplate === "catalog" ? "default" : "outline"}
                  onClick={() => { setSelectedTemplate("catalog"); setCustomMsg(""); }}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  General Catalog
                </Button>
                <Button
                  type="button"
                  variant={selectedTemplate === "new" ? "default" : "outline"}
                  onClick={() => { setSelectedTemplate("new"); setCustomMsg(""); }}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  New Arrivals
                </Button>
                <Button
                  type="button"
                  variant={selectedTemplate === "discount" ? "default" : "outline"}
                  onClick={() => { setSelectedTemplate("discount"); setCustomMsg(""); }}
                  className="h-8 text-xs font-bold rounded-lg"
                >
                  Promo Offer
                </Button>
              </div>

              <Textarea
                value={customMsg || templates[selectedTemplate]}
                onChange={(e) => setCustomMsg(e.target.value)}
                rows={4}
                className="font-sans text-xs rounded-xl bg-muted/20 border-border"
                placeholder="Type custom broadcast message..."
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBroadcast}
                  className="h-9 text-xs font-bold gap-1.5 rounded-lg"
                >
                  {copiedBroadcast ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Text
                </Button>
                <Button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="h-9 text-xs font-bold gap-1.5 bg-[#25D366] hover:bg-[#1fb355] text-white rounded-lg shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" /> Post to WhatsApp / Group
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Public Link & Table QR Shortcuts */}
        <div className="space-y-6">
          {/* Storefront QR Standee Card */}
          <Card className="border border-border/80 bg-card rounded-2xl shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">In-Store & Standee QR</CardTitle>
                  <CardDescription className="text-xs">Table ordering & counter flyers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-center">
              <div className="p-4 bg-muted/40 rounded-2xl border border-dashed border-border flex flex-col items-center justify-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <QrCode className="h-7 w-7" />
                </div>
                <p className="text-xs font-bold text-foreground">Print Standee Flyer</p>
                <p className="text-[10px] text-muted-foreground">
                  Generate table-tagged QR codes so customers can order directly from their seats.
                </p>
              </div>

              <Button
                onClick={() => setInStoreQrOpen(true)}
                className="w-full h-10 text-xs font-bold gap-2 rounded-xl"
              >
                <Printer className="h-4 w-4" /> Open Print & Design Studio
              </Button>
            </CardContent>
          </Card>

          {/* Social Channels Guide */}
          <Card className="border border-border/80 bg-card rounded-2xl shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> Online Vendor Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <p><strong className="text-foreground">Instagram Bio Link:</strong> Paste your store URL <code className="text-primary font-mono bg-muted px-1 rounded">{cleanSlug}</code> into your Instagram profile bio.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <p><strong className="text-foreground">WhatsApp Business Auto-Reply:</strong> Include your webshop link in your welcome greeting.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <p><strong className="text-foreground">Table/Counter QR:</strong> Place printed QR standees at physical checkout counters or dining tables for instant self-checkout.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Standee QR Modal */}
      <InStoreQrModal
        isOpen={inStoreQrOpen}
        onClose={() => setInStoreQrOpen(false)}
        storeName={settings.storeName || "Nexa OS Store"}
        storeSlug={cleanSlug}
        logoUrl={settings.logoUrl}
        bankName={bankName}
        accountNumber={accountNumber}
      />
    </div>
  );
}
