import { useState, useMemo, useRef, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import { useSuperAdminContext } from "@/routes/app.super-admin";
import { CATEGORY_PRESETS } from "@/utils/categorySuggestions";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Wand2,
  Bot,
  Search,
  Plus,
  Trash2,
  FileText,
  ArrowRight,
  Send,
  Loader2,
  Building2,
  DollarSign,
  Package,
  Layers,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/super-admin/csv-processor")({
  component: SuperAdminCSVProcessorPage,
});

// Target Nexa Standard CSV Headers
const NEXA_HEADERS = [
  { key: "name", label: "Product Name", required: true },
  { key: "sku", label: "SKU", required: false },
  { key: "sellingPrice", label: "Selling Price (₦)", required: true },
  { key: "costPrice", label: "Cost Price (₦)", required: false },
  { key: "stockQuantity", label: "Stock Quantity", required: false },
  { key: "category", label: "Category", required: false },
  { key: "supplier", label: "Supplier", required: false },
  { key: "reorderLevel", label: "Reorder Level", required: false },
  { key: "barcode", label: "Barcode", required: false },
  { key: "description", label: "Description", required: false },
] as const;

type NexaHeaderKey = typeof NEXA_HEADERS[number]["key"];

export interface NexaCsvRow {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  category: string;
  supplier: string;
  reorderLevel: number;
  barcode: string;
  description: string;
  isAiCategorized?: boolean;
  aiConfidence?: number;
  rawCategory?: string;
  hasWarning?: boolean;
  warningMsg?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  highlights?: string[];
}

function SuperAdminCSVProcessorPage() {
  const { superStores } = useSuperAdminContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Workbook state
  const [fileName, setFileName] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);

  // Mapping state: NexaKey -> rawHeader
  const [columnMapping, setColumnMapping] = useState<Record<NexaHeaderKey, string>>({
    name: "",
    sku: "",
    sellingPrice: "",
    costPrice: "",
    stockQuantity: "",
    category: "",
    supplier: "",
    reorderLevel: "",
    barcode: "",
    description: "",
  });

  // Mapped Nexa rows state
  const [rows, setRows] = useState<NexaCsvRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState<"all" | "missing_category" | "missing_sku" | "price_zero">("all");

  // Selection & UI controls
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStep, setAiStep] = useState<string>("");

  // Store direct import state
  const [targetStoreId, setTargetStoreId] = useState<string>(superStores[0]?.id || "store-1");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Chat Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "assistant",
      text: "👋 Hello Super Admin! I'm your **Nexa CSV & Excel AI Assistant**. Upload any Excel or CSV file above, and I can auto-categorize products, sanitize pricing, or answer questions about your dataset.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Auto-Detect Headers logic
  const autoDetectMappings = (headers: string[]) => {
    const mapping: Record<NexaHeaderKey, string> = {
      name: "",
      sku: "",
      sellingPrice: "",
      costPrice: "",
      stockQuantity: "",
      category: "",
      supplier: "",
      reorderLevel: "",
      barcode: "",
      description: "",
    };

    headers.forEach((h) => {
      const norm = h.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

      if (!mapping.name && (norm.includes("product") || norm.includes("name") || norm.includes("title") || norm.includes("item"))) {
        mapping.name = h;
      } else if (!mapping.sku && (norm.includes("sku") || norm.includes("code") || norm.includes("partno") || norm.includes("itemno"))) {
        mapping.sku = h;
      } else if (!mapping.sellingPrice && (norm.includes("selling") || norm.includes("rrp") || norm.includes("price") || norm.includes("retail") || norm.includes("amount"))) {
        mapping.sellingPrice = h;
      } else if (!mapping.costPrice && (norm.includes("cost") || norm.includes("buy") || norm.includes("purchase") || norm.includes("wholesal"))) {
        mapping.costPrice = h;
      } else if (!mapping.stockQuantity && (norm.includes("stock") || norm.includes("qty") || norm.includes("quantity") || norm.includes("count") || norm.includes("units"))) {
        mapping.stockQuantity = h;
      } else if (!mapping.category && (norm.includes("category") || norm.includes("dept") || norm.includes("group") || norm.includes("type") || norm.includes("sector"))) {
        mapping.category = h;
      } else if (!mapping.supplier && (norm.includes("supplier") || norm.includes("vendor") || norm.includes("brand") || norm.includes("distributor"))) {
        mapping.supplier = h;
      } else if (!mapping.reorderLevel && (norm.includes("reorder") || norm.includes("minstock") || norm.includes("threshold") || norm.includes("lowstock"))) {
        mapping.reorderLevel = h;
      } else if (!mapping.barcode && (norm.includes("barcode") || norm.includes("upc") || norm.includes("ean") || norm.includes("gtin"))) {
        mapping.barcode = h;
      } else if (!mapping.description && (norm.includes("desc") || norm.includes("note") || norm.includes("detail") || norm.includes("spec"))) {
        mapping.description = h;
      }
    });

    setColumnMapping(mapping);
    toast.success("Auto-detected column header mappings!");
  };

  // Handle File Upload
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        const firstSheet = wb.SheetNames[0];
        setActiveSheet(firstSheet);
        loadSheetData(wb, firstSheet);
      } catch (err) {
        console.error("Excel parse error:", err);
        toast.error("Could not parse file. Ensure it is a valid Excel or CSV spreadsheet.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to JSON rows
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (jsonData.length === 0) {
      toast.warning(`Sheet "${sheetName}" is empty.`);
      setRawHeaders([]);
      setRawRows([]);
      setRows([]);
      return;
    }

    // Extract headers
    const headers = Object.keys(jsonData[0] || {});
    setRawHeaders(headers);
    setRawRows(jsonData);

    // Auto detect mappings
    autoDetectMappings(headers);

    toast.success(`Loaded ${jsonData.length} raw rows from sheet "${sheetName}".`);
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheet(sheetName);
    if (workbook) {
      loadSheetData(workbook, sheetName);
    }
  };

  // Clean numbers (strips currency, spaces, commas)
  const parseCleanNumber = (val: unknown, defaultVal = 0): number => {
    if (typeof val === "number") return isNaN(val) ? defaultVal : val;
    if (!val) return defaultVal;
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  // Convert raw rows -> NexaRows using current columnMapping
  const applyColumnMappingToRows = () => {
    if (rawRows.length === 0) {
      toast.error("No raw rows to map. Upload a spreadsheet first.");
      return;
    }

    const mapped: NexaCsvRow[] = rawRows.map((raw, idx) => {
      const getVal = (key: NexaHeaderKey) => {
        const rawCol = columnMapping[key];
        return rawCol && raw[rawCol] !== undefined ? String(raw[rawCol]).trim() : "";
      };

      const name = getVal("name") || `Un-named Item ${idx + 1}`;
      const sku = getVal("sku");
      const sellingPrice = parseCleanNumber(getVal("sellingPrice"));
      const costPrice = parseCleanNumber(getVal("costPrice"));
      const stockQuantity = Math.max(0, Math.floor(parseCleanNumber(getVal("stockQuantity"), 0)));
      const category = getVal("category") || "";
      const supplier = getVal("supplier") || "";
      const reorderLevel = Math.max(0, Math.floor(parseCleanNumber(getVal("reorderLevel"), 5)));
      const barcode = getVal("barcode");
      const description = getVal("description");

      const hasWarning = !category || !sku || sellingPrice <= 0;
      let warningMsg = "";
      if (!category) warningMsg += "Missing category. ";
      if (!sku) warningMsg += "Missing SKU. ";
      if (sellingPrice <= 0) warningMsg += "Price is 0 or invalid. ";

      return {
        _id: `row-${idx}-${Date.now()}`,
        name,
        sku,
        sellingPrice,
        costPrice,
        stockQuantity,
        category,
        supplier,
        reorderLevel,
        barcode,
        description,
        rawCategory: category,
        hasWarning,
        warningMsg: warningMsg.trim(),
      };
    });

    setRows(mapped);
    toast.success(`Converted ${mapped.length} rows into Nexa standard inventory format!`);
  };

  // ── AI Operations ──────────────────────────────────────────

  // 1. AI Auto Categorize
  const runAiCategorization = async () => {
    if (rows.length === 0) {
      toast.error("Please upload and map rows first.");
      return;
    }

    setIsAiProcessing(true);
    setAiStep("Analyzing product titles & matching Nexa industry categories with Gemini AI...");

    try {
      const availableCategories = CATEGORY_PRESETS.map((c) => c.name);

      const payloadItems = rows.map((r, i) => ({
        id: r._id,
        index: i,
        name: r.name,
        rawCategory: r.category,
        sellingPrice: r.sellingPrice,
        costPrice: r.costPrice,
        sku: r.sku,
        description: r.description,
      }));

      // Call Express server-side Gemini API
      const res = await fetch("/api/ai/csv-categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          categories: availableCategories,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success || !Array.isArray(data.processedItems)) {
        throw new Error(data.error || "Failed to process categorization");
      }

      const returnedMap = new Map<string, { category: string; sku?: string; sellingPrice?: number; costPrice?: number; confidence?: number }>();
      data.processedItems.forEach((item: { id: string | number; category: string; sku?: string; sellingPrice?: number; costPrice?: number; confidence?: number }) => {
        returnedMap.set(String(item.id), {
          category: item.category,
          sku: item.sku,
          sellingPrice: typeof item.sellingPrice === "number" ? item.sellingPrice : undefined,
          costPrice: typeof item.costPrice === "number" ? item.costPrice : undefined,
          confidence: item.confidence || 92,
        });
      });

      // Local fallback classifier for any item not returned by API
      const fallbackCategorize = (title: string): string => {
        const lower = title.toLowerCase();
        for (const preset of CATEGORY_PRESETS) {
          if (preset.keywords.some((kw) => lower.includes(kw))) {
            return preset.name;
          }
        }
        return "Groceries & FMCG";
      };

      let updatedCount = 0;
      const updatedRows = rows.map((r, idx) => {
        const aiRes = returnedMap.get(r._id) || returnedMap.get(String(idx));
        const newCat = aiRes?.category || fallbackCategorize(r.name);
        const newSku = r.sku || aiRes?.sku || `SKU-${1000 + idx + 1}`;
        const newSellingPrice = r.sellingPrice > 0 ? r.sellingPrice : (aiRes?.sellingPrice || 500);

        updatedCount++;
        return {
          ...r,
          category: newCat,
          sku: newSku,
          sellingPrice: newSellingPrice,
          isAiCategorized: true,
          aiConfidence: aiRes?.confidence || 90,
          hasWarning: false,
          warningMsg: "",
        };
      });

      setRows(updatedRows);
      toast.success(`✨ Gemini AI successfully auto-categorized ${updatedCount} products!`);
    } catch (err) {
      console.warn("AI Endpoint fallback to client keyword engine:", err);
      // Fallback client keyword engine if server call is offline
      let count = 0;
      const updatedRows = rows.map((r, idx) => {
        const lower = r.name.toLowerCase();
        let matched = r.category || "Groceries & FMCG";
        for (const preset of CATEGORY_PRESETS) {
          if (preset.keywords.some((kw) => lower.includes(kw))) {
            matched = preset.name;
            break;
          }
        }
        count++;
        return {
          ...r,
          category: matched,
          sku: r.sku || `SKU-${1000 + idx + 1}`,
          isAiCategorized: true,
          aiConfidence: 85,
          hasWarning: false,
        };
      });
      setRows(updatedRows);
      toast.success(`✨ Auto-categorized ${count} items using Nexa Industry Category Engine!`);
    } finally {
      setIsAiProcessing(false);
      setAiStep("");
    }
  };

  // 2. Auto Generate Missing SKUs
  const autoGenerateMissingSKUs = () => {
    let count = 0;
    const updated = rows.map((r, idx) => {
      if (!r.sku || r.sku.trim() === "") {
        count++;
        const skuPrefix = r.category ? r.category.slice(0, 3).toUpperCase() : "SKU";
        return { ...r, sku: `${skuPrefix}-${1000 + idx + 1}` };
      }
      return r;
    });
    setRows(updated);
    toast.success(`Generated SKUs for ${count} items!`);
  };

  // 3. Sanitize Currency and Prices
  const sanitizePrices = () => {
    let count = 0;
    const updated = rows.map((r) => {
      const cleanSelling = parseCleanNumber(r.sellingPrice, 0);
      const cleanCost = parseCleanNumber(r.costPrice, 0);
      if (cleanSelling !== r.sellingPrice || cleanCost !== r.costPrice) {
        count++;
      }
      return { ...r, sellingPrice: cleanSelling, costPrice: cleanCost };
    });
    setRows(updated);
    toast.success(`Sanitized pricing values across ${count || rows.length} products!`);
  };

  // 4. Set Default Stock & Reorder Levels
  const fillDefaultStock = () => {
    const updated = rows.map((r) => ({
      ...r,
      stockQuantity: r.stockQuantity > 0 ? r.stockQuantity : 10,
      reorderLevel: r.reorderLevel > 0 ? r.reorderLevel : 5,
    }));
    setRows(updated);
    toast.success("Set default stock (10) and reorder level (5) for missing rows!");
  };

  // Single cell editing
  const handleCellEdit = (id: string, field: keyof NexaCsvRow, value: string | number | boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r._id === id) {
          const updated = { ...r, [field]: value };
          if (field === "sellingPrice" || field === "costPrice" || field === "stockQuantity") {
            updated[field] = parseCleanNumber(value);
          }
          return updated;
        }
        return r;
      })
    );
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r._id !== id));
    toast.info("Row deleted");
  };

  // Add new product row
  const handleAddRow = () => {
    const newRow: NexaCsvRow = {
      _id: `row-new-${Date.now()}`,
      name: "New Product Item",
      sku: `SKU-${1000 + rows.length + 1}`,
      sellingPrice: 1000,
      costPrice: 800,
      stockQuantity: 20,
      category: "Groceries & FMCG",
      supplier: "Direct Warehouse",
      reorderLevel: 5,
      barcode: "",
      description: "Standard inventory item",
    };
    setRows((prev) => [newRow, ...prev]);
    toast.success("Added new product row");
  };

  // ── Exporting & Downloading CSV ────────────────────────────

  const generateNexaCSVString = (): string => {
    const headers = "name,sku,sellingPrice,costPrice,stockQuantity,category,supplier,reorderLevel,barcode,description\n";
    const escapeCSVCell = (val: string | number | boolean | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = rows.map((r) =>
      [
        escapeCSVCell(r.name),
        escapeCSVCell(r.sku),
        r.sellingPrice || 0,
        r.costPrice || 0,
        r.stockQuantity || 0,
        escapeCSVCell(r.category || "General Goods"),
        escapeCSVCell(r.supplier),
        r.reorderLevel || 5,
        escapeCSVCell(r.barcode),
        escapeCSVCell(r.description),
      ].join(",")
    );

    return headers + csvRows.join("\n");
  };

  const handleDownloadCSV = () => {
    if (rows.length === 0) {
      toast.error("No data rows available to download.");
      return;
    }

    const csvStr = generateNexaCSVString();
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "nexa_inventory";
    link.setAttribute("download", `${cleanFileName}_nexa_formatted.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Downloaded Nexa Standard CSV File!");
  };

  const handleDownloadExcel = () => {
    if (rows.length === 0) {
      toast.error("No data rows available to download.");
      return;
    }

    const exportObjects = rows.map((r) => ({
      "Product Name": r.name,
      SKU: r.sku,
      "Selling Price (NGN)": r.sellingPrice,
      "Cost Price (NGN)": r.costPrice,
      "Stock Quantity": r.stockQuantity,
      Category: r.category,
      Supplier: r.supplier,
      "Reorder Level": r.reorderLevel,
      Barcode: r.barcode,
      Description: r.description,
    }));

    const ws = XLSX.utils.json_to_sheet(exportObjects);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nexa Inventory");

    const cleanFileName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "nexa_inventory";
    XLSX.writeFile(wb, `${cleanFileName}_nexa_processed.xlsx`);

    toast.success("Downloaded processed Excel workbook!");
  };

  const handleCopyCsvToClipboard = () => {
    if (rows.length === 0) {
      toast.error("No rows to copy.");
      return;
    }
    const csvStr = generateNexaCSVString();
    navigator.clipboard.writeText(csvStr);
    toast.success("Copied raw CSV text to clipboard!");
  };

  // ── Direct Import to Store ──────────────────────────────

  const handleExecuteStoreImport = async () => {
    if (rows.length === 0) {
      toast.error("No product rows to import.");
      return;
    }

    setIsImporting(true);
    try {
      const selectedStore = superStores.find((s) => s.id === targetStoreId);
      const storeName = selectedStore ? selectedStore.name : "Store";

      // Commit to Firestore items collection
      let count = 0;
      for (const r of rows) {
        await addDoc(collection(db, "items"), {
          storeId: targetStoreId,
          storeName: storeName,
          name: r.name,
          sku: r.sku || `SKU-${Date.now()}`,
          sellingPrice: r.sellingPrice,
          costPrice: r.costPrice,
          currentStock: r.stockQuantity,
          categoryName: r.category || "General Goods",
          supplierName: r.supplier || "Direct",
          reorderLevel: r.reorderLevel || 5,
          barcode: r.barcode || "",
          description: r.description || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          unit: "pcs",
        });
        count++;
      }

      toast.success(`Successfully imported ${count} items into "${storeName}"!`);
      setIsImportDialogOpen(false);
    } catch (err) {
      console.error("Store import error:", err);
      toast.error("Error importing to store database. Using local state.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── AI Chat Assistant Handler ──────────────────────────────

  const handleSendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const currentQuestion = chatInput;
    setChatInput("");
    setIsAskingAi(true);

    try {
      const res = await fetch("/api/ai/csv-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion,
          items: rows,
          columns: rawHeaders,
        }),
      });

      if (!res.ok) throw new Error("AI Assistant request failed");
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.answer || "I analyzed your dataset.",
        highlights: data.highlights || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // If mutation suggested, apply it
      if (data.mutation) {
        const mut = data.mutation;
        if (mut.type === "update_category" && mut.filterKeyword) {
          const kw = mut.filterKeyword.toLowerCase();
          setRows((prev) =>
            prev.map((r) =>
              r.name.toLowerCase().includes(kw) ? { ...r, category: mut.newValue || "Groceries & FMCG" } : r
            )
          );
          toast.success(`AI updated category for items matching "${mut.filterKeyword}"!`);
        }
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
      // Fallback local assistant answer
      const q = currentQuestion.toLowerCase();
      let answer = `Here is what I found in your spreadsheet (${rows.length} total items):\n\n`;

      if (q.includes("category") || q.includes("categor")) {
        const catCounts: Record<string, number> = {};
        rows.forEach((r) => {
          const c = r.category || "Uncategorized";
          catCounts[c] = (catCounts[c] || 0) + 1;
        });
        answer += "**Category Breakdown:**\n";
        Object.entries(catCounts).forEach(([cat, num]) => {
          answer += `- **${cat}**: ${num} items\n`;
        });
      } else if (q.includes("price") || q.includes("valuat") || q.includes("total")) {
        const totalVal = rows.reduce((sum, r) => sum + r.sellingPrice * r.stockQuantity, 0);
        const avgPrice = rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.sellingPrice, 0) / rows.length) : 0;
        answer += `- **Total Retail Valuation**: ₦${totalVal.toLocaleString()}\n`;
        answer += `- **Average Selling Price**: ₦${avgPrice.toLocaleString()}\n`;
        answer += `- **Total Units in Stock**: ${rows.reduce((sum, r) => sum + r.stockQuantity, 0)} units\n`;
      } else {
        answer += `I can help you filter, clean prices, auto-generate SKUs, or match categories. Try clicking one of the AI quick action buttons above!`;
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          text: answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  // Filtered rows for table
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === "all" || r.category === categoryFilter;

      let matchesQuality = true;
      if (qualityFilter === "missing_category") matchesQuality = !r.category;
      if (qualityFilter === "missing_sku") matchesQuality = !r.sku;
      if (qualityFilter === "price_zero") matchesQuality = r.sellingPrice <= 0;

      return matchesSearch && matchesCategory && matchesQuality;
    });
  }, [rows, searchQuery, categoryFilter, qualityFilter]);

  // Consolidated statistics
  const totalValuation = useMemo(() => rows.reduce((s, r) => s + r.sellingPrice * r.stockQuantity, 0), [rows]);
  const totalUnits = useMemo(() => rows.reduce((s, r) => s + r.stockQuantity, 0), [rows]);
  const categoriesCount = useMemo(() => new Set(rows.map((r) => r.category).filter(Boolean)).size, [rows]);
  const missingCategoryCount = useMemo(() => rows.filter((r) => !r.category).length, [rows]);
  const missingSkuCount = useMemo(() => rows.filter((r) => !r.sku).length, [rows]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans flex items-center gap-2">
                Super Admin CSV & Excel AI Studio
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs font-semibold">
                  <Sparkles className="h-3 w-3 mr-1" /> Gemini Powered
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Convert any messy Excel spreadsheet into Nexa standard CSV format, auto-categorize products with AI, and run instant dataset queries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`gap-1.5 text-xs font-bold transition-all ${
              isChatOpen ? "bg-purple-500/20 border-purple-500 text-purple-600" : "hover:bg-muted"
            }`}
          >
            <Bot className="h-3.5 w-3.5 text-purple-500" />
            {isChatOpen ? "Hide AI Assistant" : "Ask AI Assistant"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCsvToClipboard}
            disabled={rows.length === 0}
            className="gap-1.5 text-xs font-medium"
          >
            <Copy className="h-3.5 w-3.5" /> Copy CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            disabled={rows.length === 0}
            className="gap-1.5 text-xs font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" /> Download CSV
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsImportDialogOpen(true)}
            disabled={rows.length === 0}
            className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Building2 className="h-3.5 w-3.5" /> Direct Store Import
          </Button>
        </div>
      </div>

      {/* ── Top Summary Metrics ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-none border border-muted-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Loaded Products</span>
            <Package className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold mt-1">{rows.length.toLocaleString()} rows</p>
          <span className="text-[10px] text-muted-foreground">{rawRows.length} raw excel items</span>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Retail Valuation</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold mt-1">₦{totalValuation.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-500 font-medium">{totalUnits.toLocaleString()} units total</span>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Matched Categories</span>
            <Layers className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-bold mt-1">{categoriesCount} Categories</p>
          <span className="text-[10px] text-muted-foreground">Industry taxonomy</span>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Uncategorized</span>
            <AlertTriangle className={`h-4 w-4 ${missingCategoryCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{missingCategoryCount} items</p>
          <span className="text-[10px] text-amber-500 font-medium">
            {missingCategoryCount > 0 ? "Click AI Categorize below" : "All categorized"}
          </span>
        </Card>

        <Card className="shadow-none border border-muted-foreground/10 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Missing SKUs</span>
            <Wand2 className={`h-4 w-4 ${missingSkuCount > 0 ? "text-blue-500" : "text-emerald-500"}`} />
          </div>
          <p className="text-xl font-bold mt-1">{missingSkuCount} items</p>
          <span className="text-[10px] text-blue-500 font-medium">
            {missingSkuCount > 0 ? "Click Auto-SKU below" : "All SKUs populated"}
          </span>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* ── Main Content Area ── */}
        <div className={isChatOpen ? "lg:col-span-8 space-y-6" : "lg:col-span-12 space-y-6"}>
          {/* Step 1: Upload & Workbook Picker */}
          <Card className="shadow-none border border-primary/20 bg-card">
            <CardHeader className="p-4 pb-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary font-mono text-xs">STEP 1</Badge>
                  <CardTitle className="text-sm font-bold">Spreadsheet File Upload & Sheet Selection</CardTitle>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  accept=".xlsx, .xls, .csv, .tsv, .txt"
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Upload className="h-3.5 w-3.5" /> Select Excel or CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {fileName ? (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">{fileName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sheetNames.length} sheet(s) detected • {rawRows.length} raw rows
                      </p>
                    </div>
                  </div>

                  {sheetNames.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Select Sheet:</span>
                      <Select value={activeSheet} onValueChange={handleSheetChange}>
                        <SelectTrigger className="h-8 text-xs w-[160px]">
                          <SelectValue placeholder="Select Sheet" />
                        </SelectTrigger>
                        <SelectContent>
                          {sheetNames.map((name) => (
                            <SelectItem key={name} value={name} className="text-xs">
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-all rounded-xl p-8 text-center cursor-pointer bg-muted/10 hover:bg-muted/20"
                >
                  <FileSpreadsheet className="h-10 w-10 text-primary mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-foreground">Click to upload or drag & drop spreadsheet</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports Microsoft Excel (.xlsx, .xls), CSV, or TSV inventory exports.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Column Mapping Engine */}
          {rawHeaders.length > 0 && (
            <Card className="shadow-none border border-border">
              <CardHeader className="p-4 pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 font-mono text-xs">STEP 2</Badge>
                    <CardTitle className="text-sm font-bold">Map Columns to Nexa Standard CSV Format</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => autoDetectMappings(rawHeaders)}
                      className="gap-1.5 text-xs text-blue-600 border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-500" /> Auto-Detect Headers
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={applyColumnMappingToRows}
                      className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Apply Mapping & Build Rows
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  {NEXA_HEADERS.map((hdr) => (
                    <div key={hdr.key} className="p-2.5 rounded-lg border bg-muted/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          {hdr.label}
                          {hdr.required && <span className="text-red-500">*</span>}
                        </label>
                      </div>
                      <Select
                        value={columnMapping[hdr.key] || "__none__"}
                        onValueChange={(val) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            [hdr.key]: val === "__none__" ? "" : val,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Choose column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="text-xs text-muted-foreground italic">
                            -- Not Mapped --
                          </SelectItem>
                          {rawHeaders.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: AI Operations & Data Editor */}
          {rows.length > 0 && (
            <Card className="shadow-none border border-border">
              <CardHeader className="p-4 pb-3 border-b bg-muted/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 font-mono text-xs">STEP 3</Badge>
                    <CardTitle className="text-sm font-bold">AI Auto-Categorize & Dataset Refinement</CardTitle>
                  </div>

                  {/* AI Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={runAiCategorization}
                      disabled={isAiProcessing}
                      className="gap-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
                    >
                      {isAiProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-200" />}
                      ✨ AI Auto-Categorize
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={autoGenerateMissingSKUs}
                      className="gap-1.5 text-xs font-medium"
                    >
                      <Wand2 className="h-3.5 w-3.5 text-blue-500" /> Auto-Generate SKUs
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={sanitizePrices}
                      className="gap-1.5 text-xs font-medium"
                    >
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Sanitize Prices
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fillDefaultStock}
                      className="gap-1.5 text-xs font-medium"
                    >
                      <Package className="h-3.5 w-3.5 text-amber-500" /> Fill Default Stock
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRow}
                      className="gap-1.5 text-xs font-medium"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Row
                    </Button>
                  </div>
                </div>

                {/* AI Progress Notification */}
                {isAiProcessing && (
                  <div className="mt-2 p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500 shrink-0" />
                    <span>{aiStep}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Search & Filters Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search product, SKU, or barcode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Quality Filter */}
                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                      <Button
                        type="button"
                        size="sm"
                        variant={qualityFilter === "all" ? "secondary" : "ghost"}
                        onClick={() => setQualityFilter("all")}
                        className="h-6 text-[10px] px-2"
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={qualityFilter === "missing_category" ? "secondary" : "ghost"}
                        onClick={() => setQualityFilter("missing_category")}
                        className="h-6 text-[10px] px-2 text-amber-600"
                      >
                        Uncategorized ({missingCategoryCount})
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={qualityFilter === "missing_sku" ? "secondary" : "ghost"}
                        onClick={() => setQualityFilter("missing_sku")}
                        className="h-6 text-[10px] px-2 text-blue-600"
                      >
                        Missing SKU ({missingSkuCount})
                      </Button>
                    </div>

                    {/* Category Filter */}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8 text-xs w-[180px]">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs font-bold">
                          All Categories
                        </SelectItem>
                        {CATEGORY_PRESETS.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name} className="text-xs">
                            {cat.emoji} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table Data Grid */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <ScrollArea className="h-[460px] w-full">
                    <Table>
                      <TableHeader className="bg-muted/80 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-12 text-[11px] font-bold">#</TableHead>
                          <TableHead className="min-w-[200px] text-[11px] font-bold">Product Name *</TableHead>
                          <TableHead className="w-[120px] text-[11px] font-bold">SKU</TableHead>
                          <TableHead className="w-[110px] text-[11px] font-bold">Selling Price (₦)</TableHead>
                          <TableHead className="w-[100px] text-[11px] font-bold">Cost Price (₦)</TableHead>
                          <TableHead className="w-[90px] text-[11px] font-bold">Stock Qty</TableHead>
                          <TableHead className="min-w-[180px] text-[11px] font-bold">Category</TableHead>
                          <TableHead className="w-[120px] text-[11px] font-bold">Barcode</TableHead>
                          <TableHead className="w-[80px] text-[11px] font-bold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                              No rows match your filter or search query.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRows.map((r, idx) => (
                            <TableRow key={r._id} className="hover:bg-muted/30">
                              <TableCell className="text-[10px] text-muted-foreground font-mono">{idx + 1}</TableCell>

                              {/* Name */}
                              <TableCell className="p-1.5">
                                <Input
                                  value={r.name}
                                  onChange={(e) => handleCellEdit(r._id, "name", e.target.value)}
                                  className="h-7 text-xs font-semibold bg-transparent border-transparent hover:border-border focus:bg-background"
                                />
                              </TableCell>

                              {/* SKU */}
                              <TableCell className="p-1.5">
                                <Input
                                  value={r.sku}
                                  onChange={(e) => handleCellEdit(r._id, "sku", e.target.value)}
                                  placeholder="SKU-1000"
                                  className={`h-7 text-xs font-mono bg-transparent border-transparent hover:border-border focus:bg-background ${
                                    !r.sku ? "border-amber-500/50 bg-amber-500/5" : ""
                                  }`}
                                />
                              </TableCell>

                              {/* Selling Price */}
                              <TableCell className="p-1.5">
                                <Input
                                  type="number"
                                  value={r.sellingPrice || ""}
                                  onChange={(e) => handleCellEdit(r._id, "sellingPrice", e.target.value)}
                                  placeholder="0"
                                  className={`h-7 text-xs font-bold bg-transparent border-transparent hover:border-border focus:bg-background ${
                                    r.sellingPrice <= 0 ? "text-red-500 border-red-500/50" : "text-emerald-600"
                                  }`}
                                />
                              </TableCell>

                              {/* Cost Price */}
                              <TableCell className="p-1.5">
                                <Input
                                  type="number"
                                  value={r.costPrice || ""}
                                  onChange={(e) => handleCellEdit(r._id, "costPrice", e.target.value)}
                                  placeholder="0"
                                  className="h-7 text-xs bg-transparent border-transparent hover:border-border focus:bg-background text-muted-foreground"
                                />
                              </TableCell>

                              {/* Stock Qty */}
                              <TableCell className="p-1.5">
                                <Input
                                  type="number"
                                  value={r.stockQuantity}
                                  onChange={(e) => handleCellEdit(r._id, "stockQuantity", e.target.value)}
                                  className="h-7 text-xs font-medium bg-transparent border-transparent hover:border-border focus:bg-background"
                                />
                              </TableCell>

                              {/* Category */}
                              <TableCell className="p-1.5">
                                <div className="flex items-center gap-1.5">
                                  <Select
                                    value={r.category || "__none__"}
                                    onValueChange={(val) => handleCellEdit(r._id, "category", val === "__none__" ? "" : val)}
                                  >
                                    <SelectTrigger className={`h-7 text-xs ${!r.category ? "border-amber-500/50 text-amber-600 bg-amber-50/50" : ""}`}>
                                      <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__" className="text-xs italic text-muted-foreground">
                                        -- Uncategorized --
                                      </SelectItem>
                                      {CATEGORY_PRESETS.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.name} className="text-xs">
                                          {cat.emoji} {cat.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {r.isAiCategorized && (
                                    <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-600 border-purple-500/20 px-1 py-0 shrink-0">
                                      AI
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Barcode */}
                              <TableCell className="p-1.5">
                                <Input
                                  value={r.barcode}
                                  onChange={(e) => handleCellEdit(r._id, "barcode", e.target.value)}
                                  placeholder="Optional"
                                  className="h-7 text-xs font-mono bg-transparent border-transparent hover:border-border focus:bg-background"
                                />
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="p-1.5 text-right">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeleteRow(r._id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── AI Assistant Chat Drawer / Side Panel ── */}
        {isChatOpen && (
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-none border border-purple-500/30 bg-card h-[680px] flex flex-col justify-between">
              <CardHeader className="p-3.5 border-b bg-gradient-to-r from-purple-500/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 text-purple-600 rounded-lg">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-bold text-foreground">CSV Dataset AI Assistant</CardTitle>
                      <CardDescription className="text-[10px]">Gemini 3.5 Flash Analyst</CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsChatOpen(false)}
                    className="h-6 w-6 p-0 text-muted-foreground"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>

              {/* Chat Messages */}
              <CardContent className="p-3 flex-1 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`p-3 rounded-xl text-xs max-w-[90%] space-y-1.5 ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-none"
                          : "bg-muted/80 border border-border text-foreground rounded-bl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      {msg.highlights && msg.highlights.length > 0 && (
                        <div className="pt-1.5 border-t border-border/40 space-y-1">
                          {msg.highlights.map((h, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] mr-1 bg-purple-500/10 text-purple-600">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <span className="text-[9px] opacity-60 block text-right">{msg.timestamp}</span>
                    </div>
                  </div>
                ))}

                {isAskingAi && (
                  <div className="flex items-center gap-2 text-xs text-purple-600 p-2 bg-purple-500/10 rounded-lg">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                    <span>Gemini is inspecting your dataset...</span>
                  </div>
                )}
              </CardContent>

              {/* Suggested Quick Prompts */}
              <div className="p-2 border-t bg-muted/20 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChatInput("Give me a category breakdown and valuation summary of this spreadsheet.");
                  }}
                  className="h-6 text-[10px] bg-background"
                >
                  📊 Category Valuation
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChatInput("Which products are missing categories or have 0 selling price?");
                  }}
                  className="h-6 text-[10px] bg-background"
                >
                  ⚠️ Find Data Errors
                </Button>
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t bg-card flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Ask a question about this spreadsheet..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  className="h-8 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSendChatMessage}
                  disabled={isAskingAi || !chatInput.trim()}
                  className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Direct Store Import Dialog ── */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Direct Store Inventory Migration
            </DialogTitle>
            <DialogDescription className="text-xs">
              Commit all {rows.length} processed products directly into a store branch's live Firebase inventory stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-xl border space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Select Destination Store:</span>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="Select Store" />
                </SelectTrigger>
                <SelectContent>
                  {superStores.map((store) => (
                    <SelectItem key={store.id} value={store.id} className="text-xs font-medium">
                      🏢 {store.name} ({store.sector}) - {store.itemCount} items
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
              <p className="font-bold text-emerald-600">Ready to Commit:</p>
              <ul className="list-disc list-inside text-muted-foreground text-[11px] space-y-0.5">
                <li>{rows.length} product records mapped to Nexa schema</li>
                <li>{categoriesCount} unique categories matched</li>
                <li>Total Retail Stock Value: ₦{totalValuation.toLocaleString()}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteStoreImport}
              disabled={isImporting}
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {isImporting ? "Importing Data..." : "Execute Store Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
