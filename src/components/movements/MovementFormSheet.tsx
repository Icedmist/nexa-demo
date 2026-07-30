import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MovementType } from "@/types/inventory";
import type { Item, Location, StockMovement } from "@/types/inventory";
import { useCreateMovement } from "@/hooks/useInventoryMutations";
import { useAuth } from "@/contexts/AuthContext";

interface MovementFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Item[];
  locations: Location[];
  /** Pre-selected item (locks the field) */
  preSelectedItemId?: string | null;
}

const TYPE_OPTIONS = [
  { value: MovementType.Received, label: "Received" },
  { value: MovementType.Shipped, label: "Shipped" },
  { value: MovementType.Adjusted, label: "Adjusted" },
  { value: MovementType.Transferred, label: "Transferred" },
];

function directionForType(type: MovementType): "in" | "out" | "configurable" {
  if (type === MovementType.Received) return "in";
  if (type === MovementType.Shipped) return "out";
  if (type === MovementType.Transferred) return "out";
  return "configurable";
}

export function MovementFormSheet({
  open,
  onOpenChange,
  items,
  locations,
  preSelectedItemId,
}: MovementFormSheetProps) {
  const { user, profile } = useAuth();
  const { mutate, isLoading } = useCreateMovement();

  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<MovementType>(MovementType.Received);
  const [quantity, setQuantity] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [unitCost, setUnitCost] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [reference, setReference] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when opening
  useEffect(() => {
    if (open) {
      const selectedId = preSelectedItemId ?? "";
      setItemId(selectedId);
      const selItem = items.find((i) => i.id === selectedId);
      setUnitCost(selItem?.costPrice ? String(selItem.costPrice) : "");
      setType(MovementType.Received);
      setQuantity("");
      setDirection("in");
      setPaymentAmount("");
      setReference("");
      setFromLocationId("");
      setToLocationId("");
      setErrors({});
    }
  }, [open, preSelectedItemId, items]);

  // When item changes, auto-fill unit cost
  const handleItemSelect = (val: string) => {
    const id = val === "__none__" ? "" : val;
    setItemId(id);
    const selItem = items.find((i) => i.id === id);
    if (selItem?.costPrice) {
      setUnitCost(String(selItem.costPrice));
    }
  };

  // Auto-set direction when type changes
  useEffect(() => {
    const dir = directionForType(type);
    if (dir !== "configurable") setDirection(dir);
  }, [type]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!itemId) errs.itemId = "Item is required";

    const num = Number(quantity);
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0 || !Number.isInteger(num)) {
      errs.quantity = "Quantity must be a positive integer";
    }

    const selectedItem = items.find((i) => i.id === itemId);

    // Shipped: cannot exceed current stock
    if (!errs.quantity && selectedItem && (type === MovementType.Shipped || type === MovementType.Transferred)) {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Insufficient stock. Current quantity: ${selectedItem.currentStock}`;
      }
    }

    // Adjusted out: also cannot exceed current stock
    if (!errs.quantity && selectedItem && type === MovementType.Adjusted && direction === "out") {
      if (qty > selectedItem.currentStock) {
        errs.quantity = `Insufficient stock. Current quantity: ${selectedItem.currentStock}`;
      }
    }

    // Adjusted: note required
    if (type === MovementType.Adjusted && !reference.trim()) {
      errs.reference = "Reason for adjustment is required";
    }

    // Transferred: both locations required and different
    if (type === MovementType.Transferred) {
      if (!fromLocationId) errs.fromLocationId = "Source location is required";
      if (!toLocationId) errs.toLocationId = "Destination location is required";
      if (fromLocationId && toLocationId && fromLocationId === toLocationId) {
        errs.toLocationId = "Source and destination must differ";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const qtyNum = parseInt(quantity, 10) || 0;
  const unitCostNum = parseFloat(unitCost) || 0;
  const totalCostNum = qtyNum * unitCostNum;
  const paidNum = parseFloat(paymentAmount) || 0;
  const remainingDebtNum = Math.max(0, totalCostNum - paidNum);
  const calculatedStatus: "unpaid" | "partial" | "paid" =
    totalCostNum > 0 && paidNum >= totalCostNum ? "paid" : paidNum > 0 ? "partial" : "unpaid";

  const handleSave = () => {
    if (!validate()) return;

    const qty = parseInt(quantity, 10);
    const selectedItem = items.find((i) => i.id === itemId);
    const signedQty = direction === "in" ? qty : -qty;

    const movement: StockMovement = {
      id: crypto.randomUUID(),
      itemId,
      type,
      quantity: signedQty,
      fromLocationId: type === MovementType.Transferred ? fromLocationId || null : null,
      toLocationId: type === MovementType.Transferred ? toLocationId || null : null,
      reference,
      notes: reference,
      performedBy: user?.displayName || profile?.name || "Store Manager",
      createdAt: new Date().toISOString(),
      unitCostNgn: unitCostNum > 0 ? unitCostNum : undefined,
      totalCostNgn: totalCostNum > 0 ? totalCostNum : undefined,
      paymentAmountNgn: paidNum > 0 ? paidNum : undefined,
      remainingBalanceNgn: totalCostNum > 0 ? remainingDebtNum : undefined,
      paymentStatus: totalCostNum > 0 ? calculatedStatus : undefined,
      storeId: profile?.storeId,
    };

    mutate(movement, {
      onSuccess: () => {
        const label = selectedItem?.name ?? itemId;
        const sign = direction === "in" ? "+" : "−";
        toast.success(`Movement logged: ${sign}${qty} ${label} (${type})`, {
          duration: 5000,
        });
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message || "Failed to log movement. Please try again."),
    });
  };

  const isTransfer = type === MovementType.Transferred;
  const isAdjusted = type === MovementType.Adjusted;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Log Movement & Payment</SheetTitle>
          <SheetDescription>Record a stock movement, manager payments, and remaining balance/debt.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Item */}
          <div>
            <Label className="mb-1.5 block text-sm">Item *</Label>
            <Select
              value={itemId || "__none__"}
              onValueChange={handleItemSelect}
              disabled={!!preSelectedItemId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>Select item</SelectItem>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.itemId && <p className="mt-1 text-xs text-destructive">{errors.itemId}</p>}
          </div>

          {/* Type */}
          <div>
            <Label className="mb-1.5 block text-sm">Movement Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-sm">Quantity *</Label>
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="Enter qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {errors.quantity && <p className="mt-1 text-xs text-destructive">{errors.quantity}</p>}
            </div>

            <div>
              <Label className="mb-1.5 block text-sm">Unit Cost (₦)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                placeholder="e.g. 1500"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>

          {/* Financials & Debt Breakdown */}
          {qtyNum > 0 && unitCostNum > 0 && (
            <div className="p-3 rounded-lg bg-muted/60 border border-border space-y-2 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Total Value of Goods:</span>
                <span className="font-bold text-foreground">₦{totalCostNum.toLocaleString()}</span>
              </div>

              <div>
                <Label className="mb-1 block text-xs font-medium">Payment Made by Manager (₦)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Enter amount paid"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Remaining Debt / Balance:</span>
                <span className={`font-bold font-mono text-sm ${remainingDebtNum > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                  ₦{remainingDebtNum.toLocaleString()} {remainingDebtNum > 0 ? "(Pending)" : "(Paid)"}
                </span>
              </div>
            </div>
          )}

          {/* Direction (only for adjusted) */}
          {isAdjusted && (
            <div>
              <Label className="mb-1.5 block text-sm">Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as "in" | "out")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">In (add stock)</SelectItem>
                  <SelectItem value="out">Out (remove stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Transfer locations */}
          {isTransfer && (
            <>
              <div>
                <Label className="mb-1.5 block text-sm">From Location</Label>
                <Select value={fromLocationId || "__none__"} onValueChange={(v) => setFromLocationId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Select location</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fromLocationId && <p className="mt-1 text-xs text-destructive">{errors.fromLocationId}</p>}
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">To Location</Label>
                <Select value={toLocationId || "__none__"} onValueChange={(v) => setToLocationId(v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Select location</SelectItem>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.toLocationId && <p className="mt-1 text-xs text-destructive">{errors.toLocationId}</p>}
              </div>
            </>
          )}

          {/* Reference note */}
          <div>
            <Label className="mb-1.5 block text-sm">Reference Note{isAdjusted ? " *" : ""}</Label>
            <Textarea
              placeholder={isAdjusted ? "Reason for adjustment (required)" : "Optional note or reference"}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={3}
            />
            {errors.reference && <p className="mt-1 text-xs text-destructive">{errors.reference}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1 bg-primary">
              {isLoading ? "Saving…" : "Save Movement"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
