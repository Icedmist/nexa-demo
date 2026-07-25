import { useState } from "react";
import { 
  FileText, 
  Download, 
  Share2, 
  Search, 
  ExternalLink, 
  Check, 
  Eye, 
  FileCheck, 
  Sparkles,
  FileSpreadsheet,
  FileCode,
  SlidersHorizontal
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export interface AgentResource {
  id: string;
  title: string;
  description: string;
  category: "Flyers" | "Legal" | "Hardware" | "Pitch Decks" | "Cheatsheets";
  fileType: "PDF" | "PNG" | "PPTX" | "DOCX" | "ZIP";
  fileSize: string;
  updatedAt: string;
  downloadsCount: number;
  featured?: boolean;
  contentPreview?: string;
  downloadUrl?: string;
}

export const SAMPLE_AGENT_RESOURCES: AgentResource[] = [
  {
    id: "res-001",
    title: "NexaStoreOS Retail Flyer & Value Proposition (A4)",
    description: "Print-ready high resolution marketing flyer for physical shop visits. Highlights multi-store stock, offline POS, and instant receipt generation.",
    category: "Flyers",
    fileType: "PDF",
    fileSize: "2.4 MB",
    updatedAt: "2026-07-15",
    downloadsCount: 342,
    featured: true,
    contentPreview: "NexaStoreOS Retail Value Sheet:\n- Eliminate Stock Theft & Mismatches\n- Full Offline Sales Mode (No Internet Needed)\n- WhatsApp Electronic Receipts & Thermal Printing\n- Multi-Staff Permission Control"
  },
  {
    id: "res-002",
    title: "Standard Merchant Onboarding Contract & Terms",
    description: "Official legal agreement form for merchant store onboarding. Defines service SLA, agent support duties, and subscription billing.",
    category: "Legal",
    fileType: "PDF",
    fileSize: "850 KB",
    updatedAt: "2026-07-01",
    downloadsCount: 189,
    featured: true,
    contentPreview: "NEXA STORE OS - MERCHANT SERVICE AGREEMENT\nThis agreement confirms the registration of Merchant Store under NexaStoreOS software platform managed by Authorized Field Agent..."
  },
  {
    id: "res-003",
    title: "Recommended Hardware & Bluetooth Scanner Specs",
    description: "Technical hardware specification guide detailing compatible 58mm/80mm thermal printers, Android POS terminals, and Bluetooth barcode scanners.",
    category: "Hardware",
    fileType: "PDF",
    fileSize: "1.8 MB",
    updatedAt: "2026-06-20",
    downloadsCount: 215,
    contentPreview: "COMPATIBLE POS HARDWARE SPECIFICATIONS:\n1. Thermal Printers: ESC/POS 58mm USB/Bluetooth (MunByn, Sunmi V2)\n2. Barcode Scanners: 1D/2D Handheld CCD Scanners\n3. Tablets: Android 10+ with 3GB RAM min."
  },
  {
    id: "res-004",
    title: "Merchant Sales Pitch Deck (Slide Stack)",
    description: "10-slide presentation deck formatted for tablet or phone presentations when meeting enterprise retail managers and supermarket directors.",
    category: "Pitch Decks",
    fileType: "PPTX",
    fileSize: "5.2 MB",
    updatedAt: "2026-07-10",
    downloadsCount: 298,
    featured: true,
    contentPreview: "SLIDE 1: The Modern Nigerian Retail Challenge\nSLIDE 2: Why Legacy POS Systems Fail Small Businesses\nSLIDE 3: Introducing NexaStoreOS\nSLIDE 4: Live Inventory & Reorder Intelligence"
  },
  {
    id: "res-005",
    title: "Excel Stock CSV Migration Template & Cheat Sheet",
    description: "Ready-to-use CSV spreadsheet template pre-populated with required headers (name, sku, sellingPrice, costPrice, stockQuantity, category, barcode).",
    category: "Cheatsheets",
    fileType: "ZIP",
    fileSize: "420 KB",
    updatedAt: "2026-07-18",
    downloadsCount: 512,
    contentPreview: "CSV CHEAT SHEET:\nHeaders: name,sku,sellingPrice,costPrice,stockQuantity,category,supplier,reorderLevel,barcode,description\nRules: Keep numbers pure (no ₦ or commas)."
  },
  {
    id: "res-006",
    title: "Field Agent Quick Pitch Script & Handling Objections",
    description: "Pocket reference document with battle-tested responses for common merchant objections (e.g., 'We use paper notebooks', 'Internet is unstable').",
    category: "Cheatsheets",
    fileType: "DOCX",
    fileSize: "610 KB",
    updatedAt: "2026-07-05",
    downloadsCount: 405,
    contentPreview: "OBJECTION 1: 'My staff might tamper with inventory.'\nRESPONSE: 'Nexa lets you set custom permissions so cashiers can only make sales, while cost prices and margin reports require your admin PIN.'"
  }
];

export function AgentResourcesView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [previewResource, setPreviewResource] = useState<AgentResource | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["All", "Flyers", "Legal", "Hardware", "Pitch Decks", "Cheatsheets"];

  const filteredResources = SAMPLE_AGENT_RESOURCES.filter((res) => {
    const matchesCategory = selectedCategory === "All" || res.category === selectedCategory;
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (res: AgentResource) => {
    const textContent = `--- ${res.title} ---\nCategory: ${res.category}\nUpdated: ${res.updatedAt}\n\n${res.contentPreview || res.description}`;
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${res.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${res.fileType.toLowerCase()}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${res.title}...`);
  };

  const handleCopyShareLink = (res: AgentResource) => {
    const shareUrl = `${window.location.origin}/agents?resource=${res.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(res.id);
    toast.success("Resource sharing link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#141528] via-[#1A1C36] to-[#0F1020] border border-white/10 rounded-2xl text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#2B5BFF]/20 text-[#2B5BFF] border-none text-[10px] uppercase font-bold">
              Official Collateral Repository
            </Badge>
            <Badge className="bg-[#4DE89A]/20 text-[#4DE89A] border-none text-[10px] uppercase font-bold">
              Field Ready
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-['Bricolage_Grotesque'] text-white">
            Field Agent File &amp; Resource Management
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Access, preview, and download official NexaStoreOS pitch decks, merchant contracts, high-resolution flyers, hardware specifications, and CSV migration templates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={() => handleDownload(SAMPLE_AGENT_RESOURCES[0])}
            className="bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white font-bold text-xs h-9 gap-2 rounded-xl"
          >
            <Download className="h-4 w-4" /> Download Agent Starter Pack
          </Button>
        </div>
      </div>

      {/* CONTROLS: SEARCH & CATEGORY FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141528] border border-white/10 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search flyers, contracts, pitch decks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder-slate-500 rounded-xl text-xs h-9"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-[#00C4CF] text-[#0B0C1E] shadow-sm font-bold"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* RESOURCE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map((res) => (
          <Card key={res.id} className="bg-[#141528] border border-white/10 hover:border-[#00C4CF]/40 transition-all rounded-2xl p-5 text-white flex flex-col justify-between group space-y-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2.5 bg-white/5 group-hover:bg-[#00C4CF]/10 text-[#00C4CF] rounded-xl transition-colors">
                  {res.fileType === "PDF" && <FileText className="h-6 w-6" />}
                  {res.fileType === "PPTX" && <Sparkles className="h-6 w-6 text-amber-400" />}
                  {res.fileType === "ZIP" && <FileSpreadsheet className="h-6 w-6 text-emerald-400" />}
                  {(res.fileType === "DOCX" || res.fileType === "PNG") && <FileCode className="h-6 w-6 text-blue-400" />}
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="border-white/10 text-slate-300 text-[10px] uppercase font-mono">
                    {res.fileType}
                  </Badge>
                  <Badge className="bg-white/5 text-slate-400 border-none text-[10px]">
                    {res.fileSize}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#00C4CF] transition-colors line-clamp-1">
                  {res.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mt-1">
                  {res.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">
                Updated {res.updatedAt}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreviewResource(res)}
                  className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg gap-1"
                >
                  <Eye className="h-3.5 w-3.5 text-[#00C4CF]" /> Preview
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopyShareLink(res)}
                  className="h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                  title="Copy link"
                >
                  {copiedId === res.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleDownload(res)}
                  className="h-8 px-2.5 text-xs bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white font-bold rounded-lg gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> Get
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="p-12 text-center bg-[#141528] border border-white/10 rounded-2xl space-y-3">
          <div className="p-3 bg-white/5 text-slate-400 rounded-2xl w-fit mx-auto">
            <SlidersHorizontal className="h-8 w-8" />
          </div>
          <h4 className="text-sm font-bold text-white">No collateral matching search criteria</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or switching categories to browse all agent files.
          </p>
        </div>
      )}

      {/* PREVIEW MODAL */}
      <Dialog open={!!previewResource} onOpenChange={() => setPreviewResource(null)}>
        <DialogContent className="sm:max-w-[620px] bg-[#141528] border border-white/10 text-white rounded-3xl p-6">
          {previewResource && (
            <div className="space-y-4">
              <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#00C4CF]/20 text-[#00C4CF] border-none text-[10px] uppercase font-bold">
                    {previewResource.category}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-slate-300 text-[10px]">
                    {previewResource.fileType} • {previewResource.fileSize}
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold text-white">
                  {previewResource.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  {previewResource.description}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 bg-slate-950 border border-white/10 rounded-2xl text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto">
                {previewResource.contentPreview || "File ready for field distribution."}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Total Agent Downloads: {previewResource.downloadsCount}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopyShareLink(previewResource)}
                    className="border-white/20 text-white hover:bg-white/10 text-xs font-bold gap-1.5 rounded-xl h-9"
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share Link
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      handleDownload(previewResource);
                      setPreviewResource(null);
                    }}
                    className="bg-[#2B5BFF] hover:bg-[#1B4BEE] text-white text-xs font-bold gap-1.5 rounded-xl h-9"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
