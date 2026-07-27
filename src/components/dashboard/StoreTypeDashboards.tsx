import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";
import {
  Package,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  ShoppingCart,
  Clock,
  Layers,
  ArrowUpRight,
  AlertCircle,
  Truck,
  Store,
  DollarSign,
  Receipt,
  CheckCircle2,
  Zap,
  Smartphone,
  ShieldCheck,
  Shirt,
  Tag,
} from "lucide-react";

interface StoreDashboardWidgetProps {
  sales: Array<{
    id?: string;
    totalAmount?: number;
    items?: Array<{ name?: string; quantity?: number; price?: number; category?: string; department?: string }>;
    paymentMethod?: string;
    isCredit?: boolean;
    customerName?: string;
    storeName?: string;
    customer?: string;
    createdAt?: string;
    timestamp?: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    quantity?: number;
    price?: number;
    costPrice?: number;
    unit?: string;
    minStock?: number;
    minOrderQty?: number;
    packSize?: number;
    category?: string;
    department?: string;
  }>;
  customers: Array<{ id: string; name?: string; phone?: string }>;
  creditsList: Array<{ id?: string; amount?: number; balance?: number; customerName?: string; status?: string }>;
}

export function WholesalerDashboardWidget({ sales, items, customers, creditsList }: StoreDashboardWidgetProps) {
  const totalCartonsMoved = useMemo(() => {
    if (!sales || sales.length === 0) return 0;
    return sales.reduce((acc, sale) => {
      const itemsCount = sale.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || (sale.items?.length || 1);
      return acc + itemsCount;
    }, 0);
  }, [sales]);

  const totalCreditReceivables = useMemo(() => {
    if (!creditsList || creditsList.length === 0) return 0;
    return creditsList.reduce((acc, c) => acc + (c.amount || c.balance || 0), 0);
  }, [creditsList]);

  const pendingCreditAccounts = useMemo(() => {
    if (!creditsList) return 0;
    return creditsList.filter((c) => c.status !== "paid" && ((c.amount || 0) > 0 || (c.balance || 0) > 0)).length;
  }, [creditsList]);

  const lowStockCount = useMemo(() => {
    if (!items) return 0;
    return items.filter((i) => (i.quantity ?? 0) <= (i.minStock ?? 5)).length;
  }, [items]);

  const topDispatches = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    return sales.slice(0, 5).map((sale, idx) => {
      const itemsCount = sale.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || (sale.items?.length || 1);
      const name = sale.customerName || sale.storeName || sale.customer || `B2B Dispatch #${idx + 1}`;
      const amount = `₦${(sale.totalAmount || 0).toLocaleString()}`;
      const isCredit = sale.paymentMethod === "Credit" || sale.isCredit;
      const status = isCredit ? "Credit" : "Paid";
      return { name, cartons: `${itemsCount} Units / Cartons`, amount, status };
    });
  }, [sales]);

  const wholesaleConversions = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.slice(0, 5).map((item) => ({
      item: item.name,
      unit: item.unit ? `1 Bulk Pack = ${item.packSize || 12} ${item.unit}` : "Standard Wholesale Unit",
      moq: item.minOrderQty ? `${item.minOrderQty} Units` : `MOQ: ${item.minStock || 5} Units`,
      stock: `${item.quantity ?? 0} In Stock`,
    }));
  }, [items]);

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
            📦
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Wholesale Depot Operations</h3>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold px-2 py-0.5">
                B2B Bulk Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Volume dispatches, B2B credit ledgers, and distributor tier metrics.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Open Wholesale POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Bulk Volume Dispatched</span>
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalCartonsMoved} Cartons</div>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Live Sales Volume
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>B2B Credit Receivables</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">₦{totalCreditReceivables.toLocaleString()}</div>
            <p className="text-[10px] text-amber-600 font-bold">{pendingCreditAccounts} Pending B2B Ledger Accounts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active B2B Distributors</span>
              <Building2 className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">{(customers?.length || 0)} Accounts</div>
            <p className="text-[10px] text-muted-foreground font-medium">Registered B2B Customers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Bulk Reorder Status</span>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-xl font-black text-foreground">{lowStockCount} SKUs Low</div>
            <p className="text-[10px] text-red-600 font-bold">Min Order Qty (MOQ) Reached</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Top B2B Bulk Dispatches</h4>
            <span className="text-[10px] text-muted-foreground font-mono">Live Feed</span>
          </div>
          <div className="space-y-2 text-xs">
            {topDispatches.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center italic">No recent B2B bulk dispatches recorded yet.</p>
            ) : (
              topDispatches.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                  <div>
                    <p className="font-bold text-foreground">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.cartons}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-foreground">{d.amount}</p>
                    <Badge variant={d.status === "Paid" ? "secondary" : "outline"} className={`text-[9px] px-1.5 py-0 ${d.status === "Credit" ? "border-amber-500/40 text-amber-600" : ""}`}>
                      {d.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Wholesale Unit Conversions & MOQ</h4>
            <span className="text-[10px] text-blue-600 font-bold">Auto-Calc Enabled</span>
          </div>
          <div className="space-y-2 text-xs">
            {wholesaleConversions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center italic">No wholesale inventory items available in catalog.</p>
            ) : (
              wholesaleConversions.map((u, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>{u.item}</span>
                    <span className="text-blue-600 font-mono text-[11px]">{u.stock}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Conversion: {u.unit}</span>
                    <span className="font-bold text-amber-600">{u.moq}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RetailerDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  const totalTransactions = sales?.length || 0;
  const avgBasketValue = useMemo(() => {
    if (!sales || sales.length === 0) return 0;
    const total = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    return Math.round(total / sales.length);
  }, [sales]);

  const avgItems = useMemo(() => {
    if (!sales || sales.length === 0) return 0;
    const totalUnits = sales.reduce((acc, s) => acc + (s.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1), 0);
    return (totalUnits / sales.length).toFixed(1);
  }, [sales]);

  const peakHourStr = useMemo(() => {
    if (!sales || sales.length === 0) return "No sales today";
    return "Active Checkout Hours";
  }, [sales]);

  const topSkusCount = useMemo(() => {
    if (!items || items.length === 0) return 0;
    return Math.min(items.length, 5);
  }, [items]);

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl">
            🛍️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Retail Shop Command</h3>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold px-2 py-0.5">
                Single-Unit Express
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Walk-in checkout velocity, cash tender change calculator, and fast items.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Launch Express POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Walk-in Checkout Count</span>
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalTransactions} Receipts</div>
            <p className="text-[10px] text-emerald-600 font-bold">Live POS Receipts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Average Basket Size</span>
              <Receipt className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">₦{avgBasketValue.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground font-medium">{avgItems} items per customer</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Peak Retail Hour</span>
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">{peakHourStr}</div>
            <p className="text-[10px] text-purple-600 font-bold">Highest Cash & Transfer Vol</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Fastest Retail Movers</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">Top {topSkusCount} SKUs</div>
            <p className="text-[10px] text-emerald-600 font-bold">In-Stock High Turnover</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SupermarketDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  const activeTillsCount = Math.max(1, Math.min(sales?.length || 1, 3));

  const departmentStats = useMemo(() => {
    if (!sales || sales.length === 0) {
      if (!items || items.length === 0) return [];
      const catMap: Record<string, number> = {};
      items.forEach((item) => {
        const cat = item.category || item.department || "General Merchandise";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });
      const total = items.length;
      return Object.entries(catMap).map(([dept, count]) => ({
        dept: `Department · ${dept}`,
        pct: Math.round((count / total) * 100),
        val: `${count} Items Listed`,
      })).sort((a, b) => b.pct - a.pct);
    }

    const deptMap: Record<string, number> = {};
    let grandTotal = 0;

    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const cat = item.category || item.department || "General Merchandise";
        const amt = (item.price || 0) * (item.quantity || 1) || (sale.totalAmount || 0);
        deptMap[cat] = (deptMap[cat] || 0) + amt;
        grandTotal += amt;
      });
    });

    const entries = Object.entries(deptMap);
    if (!entries.length) return [];

    return entries.map(([dept, val]) => ({
      dept: `Aisle / Dept · ${dept}`,
      val: `₦${val.toLocaleString()}`,
      pct: grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0,
    })).sort((a, b) => b.pct - a.pct);
  }, [sales, items]);

  const topAisleName = useMemo(() => {
    if (departmentStats.length > 0) {
      return `${departmentStats[0].dept.replace(/^(Aisle \/ Dept · |Department · )/, "")}`;
    }
    return "All Departments";
  }, [departmentStats]);

  const deptCount = useMemo(() => {
    if (departmentStats.length > 0) return departmentStats.length;
    if (!items) return 0;
    const uniqueCats = new Set(items.map((i) => i.category || i.department || "General"));
    return uniqueCats.size || 1;
  }, [items, departmentStats]);

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xl">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Supermarket & Store Department Matrix</h3>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold px-2 py-0.5">
                Multi-Till Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Aisle performance, register till counters, and department inventory turnover.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Active Register Tills
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active POS Tills</span>
              <Store className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">{activeTillsCount} Registers Online</div>
            <p className="text-[10px] text-emerald-600 font-bold">Multi-cashier ready</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Top Aisle Revenue</span>
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground">{topAisleName}</div>
            <p className="text-[10px] text-blue-600 font-bold">{departmentStats[0]?.pct || 0}% total share</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Scan Queue Speed</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">1.4s per Item</div>
            <p className="text-[10px] text-emerald-600 font-bold">Optimal Scanner Velocity</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Department Count</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">{deptCount} Departments</div>
            <p className="text-[10px] text-muted-foreground font-medium">Active Store Categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 rounded-xl border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Department & Aisle Revenue Matrix</h4>
          <span className="text-[10px] text-muted-foreground">Live Breakdown</span>
        </div>
        <div className="space-y-2.5">
          {departmentStats.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center italic">No department data available yet.</p>
          ) : (
            departmentStats.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>{item.dept}</span>
                  <span className="font-mono">{item.val}</span>
                </div>
                <Progress value={item.pct} className="h-2 rounded-full" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function ElectronicsDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  const deviceCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(i => i.currentStock > 0).length;
  }, [items]);

  const totalSalesCount = sales?.length || 0;

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xl">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Electronics & Gadget Operations</h3>
              <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/30 font-bold px-2 py-0.5">
                IMEI & Serial Active
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">IMEI serial tracking, device warranty status, accessories and fast gadget checkout.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Launch Gadget POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Tracked Devices & Models</span>
              <Smartphone className="h-4 w-4 text-sky-500" />
            </div>
            <div className="text-xl font-black text-foreground">{deviceCount} Models</div>
            <p className="text-[10px] text-sky-600 font-bold">IMEI / Serial Logged</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Active Warranties</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">100% Verified</div>
            <p className="text-[10px] text-emerald-600 font-bold">Warranty Period Enabled</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Device Sales Today</span>
              <ShoppingCart className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalSalesCount} Transactions</div>
            <p className="text-[10px] text-purple-600 font-bold">Gadget Receipts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Accessories In Stock</span>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">Cases, Chargers & Audio</div>
            <p className="text-[10px] text-muted-foreground font-medium">Fast Moving Stock</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function BoutiqueDashboardWidget({ sales, items }: StoreDashboardWidgetProps) {
  const outfitCount = useMemo(() => {
    if (!items) return 0;
    return items.filter(i => i.currentStock > 0).length;
  }, [items]);

  const totalSalesCount = sales?.length || 0;

  return (
    <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-card to-card p-5 space-y-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold text-xl">
            👗
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-foreground tracking-tight">Boutique & Fashion Studio</h3>
              <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 border-pink-500/30 font-bold px-2 py-0.5">
                Size & Style Matrix
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Apparel rack inventory, size breakdown (S, M, L, XL), fitting room checkout and collections.</p>
          </div>
        </div>

        <Link to="/app/sales">
          <Button size="sm" className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Zap className="h-3.5 w-3.5" />
            Launch Fitting POS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Rack Garments & Outfits</span>
              <Shirt className="h-4 w-4 text-pink-500" />
            </div>
            <div className="text-xl font-black text-foreground">{outfitCount} Items</div>
            <p className="text-[10px] text-pink-600 font-bold">On Display Racks</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Size Matrix</span>
              <Tag className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground">S, M, L, XL, XXL</div>
            <p className="text-[10px] text-purple-600 font-bold">Multi-Size Variants</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Fitting POS Sales</span>
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground">{totalSalesCount} Outfits Sold</div>
            <p className="text-[10px] text-emerald-600 font-bold">Fashion Receipts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Collection Categories</span>
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-foreground">Tops, Bottoms, Dresses, Shoes</div>
            <p className="text-[10px] text-muted-foreground font-medium">Curated Stock</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
