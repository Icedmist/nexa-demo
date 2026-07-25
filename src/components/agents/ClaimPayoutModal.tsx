import { useState } from "react";
import { 
  Wallet, 
  Building2, 
  CreditCard, 
  DollarSign, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  Clock,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";

interface ClaimPayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentUid: string;
  agentName: string;
  agentId: string;
  pendingBalance: number;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  onSuccess?: () => void;
}

export function ClaimPayoutModal({
  open,
  onOpenChange,
  agentUid,
  agentName,
  agentId,
  pendingBalance,
  bankName = "",
  accountNumber = "",
  accountName = "",
  onSuccess
}: ClaimPayoutModalProps) {
  const [claimType, setClaimType] = useState<"logistics" | "earnings" | "custom">("logistics");
  const [requestedAmount, setRequestedAmount] = useState<number>(10000);
  const [inputBank, setInputBank] = useState(bankName || "Access Bank");
  const [inputAccountNo, setInputAccountNo] = useState(accountNumber || "");
  const [inputAccountName, setInputAccountName] = useState(accountName || agentName);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedClaim, setSubmittedClaim] = useState<boolean>(false);

  const handleClaimTypeChange = (type: "logistics" | "earnings" | "custom") => {
    setClaimType(type);
    if (type === "logistics") {
      setRequestedAmount(10000);
    } else if (type === "earnings") {
      setRequestedAmount(pendingBalance > 0 ? pendingBalance : 1500);
    } else {
      setRequestedAmount(5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAccountNo || inputAccountNo.length < 10) {
      toast.error("Please enter a valid 10-digit Nigerian bank account number.");
      return;
    }
    if (!requestedAmount || requestedAmount <= 0) {
      toast.error("Please enter a valid claim amount.");
      return;
    }

    setSubmitting(true);
    try {
      const claimId = `payout-${Date.now()}`;
      const timestamp = new Date().toISOString();

      await setDoc(doc(db, "agentPayoutRequests", claimId), {
        id: claimId,
        agentUid,
        agentId,
        agentName,
        claimType,
        amount: Number(requestedAmount),
        bankName: inputBank,
        accountNumber: inputAccountNo.trim(),
        accountName: inputAccountName.trim() || agentName,
        status: "pending_review",
        notes: notes.trim(),
        createdAt: timestamp
      });

      // Update agent bank details if not present
      await updateDoc(doc(db, "agents", agentUid), {
        bank: inputBank,
        accountNumber: inputAccountNo.trim(),
        accountName: inputAccountName.trim()
      }).catch((err) => console.warn("Agent bank details update fallback:", err));

      setSubmittedClaim(true);
      toast.success(`Payout claim of ₦${Number(requestedAmount).toLocaleString()} submitted to State Lead for review!`);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Error submitting payout claim:", err);
      toast.error("Failed to submit payout claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setSubmittedClaim(false); }}>
      <DialogContent className="max-w-md bg-[#141528] border border-white/10 text-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-['Bricolage_Grotesque'] text-white">
            <Wallet className="h-6 w-6 text-[#4DE89A]" />
            Claim Payout / Logistics Allowance
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Request direct bank transfer disbursement for your Field Logistics Allowance or cleared merchant residuals.
          </DialogDescription>
        </DialogHeader>

        {submittedClaim ? (
          <div className="space-y-6 py-4 text-center">
            <div className="h-16 w-16 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white">Payout Claim Submitted!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your request of <span className="font-mono font-bold text-[#4DE89A]">₦{Number(requestedAmount).toLocaleString()}</span> has been routed to your State Operations Lead for settlement verification.
              </p>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Account:</span>
                <span className="text-white font-bold">{inputAccountNo} ({inputBank})</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Account Name:</span>
                <span className="text-white">{inputAccountName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Expected SLA:</span>
                <span className="text-[#00C4CF] font-bold">24–48 Hours</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => { onOpenChange(false); setSubmittedClaim(false); }}
              className="w-full bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-2xl text-xs py-3"
            >
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            
            {/* CLAIM CATEGORY SELECTION */}
            <div className="space-y-2">
              <Label className="text-slate-300 font-bold">Select Payout Category</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleClaimTypeChange("logistics")}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    claimType === "logistics"
                      ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-amber-300 font-bold">Logistics Allowance</span>
                    <Badge className="bg-amber-500/30 text-amber-200 border-none text-[8px]">Fixed</Badge>
                  </div>
                  <span className="font-mono font-extrabold text-white block text-sm">₦10,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClaimTypeChange("earnings")}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    claimType === "earnings"
                      ? "bg-emerald-500/20 border-emerald-500 text-white font-bold"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-[#4DE89A] font-bold">Cleared Residuals</span>
                    <Badge className="bg-emerald-500/30 text-[#4DE89A] border-none text-[8px]">Earned</Badge>
                  </div>
                  <span className="font-mono font-extrabold text-white block text-sm">
                    ₦{pendingBalance > 0 ? pendingBalance.toLocaleString() : "1,500"}
                  </span>
                </button>
              </div>
            </div>

            {/* AMOUNT INPUT */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 font-bold">Amount to Withdraw (₦) *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  min={1000}
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="pl-9 bg-white/5 border-white/10 text-white font-mono text-sm font-bold rounded-xl h-10"
                  required
                />
              </div>
            </div>

            {/* BANK DETAILS */}
            <div className="space-y-3 pt-1 border-t border-white/10">
              <div className="flex justify-between items-center">
                <Label className="text-slate-300 font-bold">Bank Transfer Settlement Destination</Label>
                <ShieldCheck className="h-4 w-4 text-[#4DE89A]" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-[10px] uppercase">Bank Name</Label>
                <Input
                  value={inputBank}
                  onChange={(e) => setInputBank(e.target.value)}
                  placeholder="e.g. Access Bank, OPay, GTBank"
                  className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase">Account Number</Label>
                  <Input
                    maxLength={10}
                    value={inputAccountNo}
                    onChange={(e) => setInputAccountNo(e.target.value)}
                    placeholder="10-digit account no"
                    className="bg-white/5 border-white/10 text-white font-mono rounded-xl h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-[10px] uppercase">Account Name</Label>
                  <Input
                    value={inputAccountName}
                    onChange={(e) => setInputAccountName(e.target.value)}
                    placeholder="Account Name"
                    className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* NOTES */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-[10px] uppercase">Optional Note for State Lead</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Orientation attended in Jalingo on July 20"
                className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-slate-400 hover:text-white rounded-2xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold rounded-2xl text-xs gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting Request..." : "Submit Payout Claim"}
              </Button>
            </div>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
