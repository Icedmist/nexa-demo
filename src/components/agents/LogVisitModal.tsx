import { useState } from "react";
import { MapPin, Calendar, Clock, FileText, Send, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface LogVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  storeName: string;
  agentUid: string;
  agentName: string;
  onSuccess?: () => void;
}

export function LogVisitModal({
  open,
  onOpenChange,
  storeId,
  storeName,
  agentUid,
  agentName,
  onSuccess
}: LogVisitModalProps) {
  const [outcome, setOutcome] = useState<"demo_given" | "followup_scheduled" | "payment_promised" | "onboarded" | "not_interested">("demo_given");
  const [notes, setNotes] = useState("");
  const [nextFollowup, setNextFollowup] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please add visit notes describing your interaction with the merchant.");
      return;
    }

    setSubmitting(true);
    try {
      const visitId = `visit-${Date.now()}`;
      const timestamp = new Date().toISOString();

      await setDoc(doc(db, "agentVisits", visitId), {
        id: visitId,
        storeId,
        storeName,
        agentUid,
        agentName,
        outcome,
        notes: notes.trim(),
        nextFollowup: nextFollowup || null,
        createdAt: timestamp
      });

      toast.success(`Field visit note logged for "${storeName}"!`);
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setNotes("");
      setNextFollowup("");
    } catch (err) {
      console.error("Error logging visit:", err);
      toast.error("Failed to log visit note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#141528] border border-white/10 text-white rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold font-['Bricolage_Grotesque'] text-white">
            <MapPin className="h-5 w-5 text-[#00C4CF]" />
            Log Field Visit for {storeName}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Record your field interaction notes to track merchant follow-ups in your territory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          
          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Visit Outcome *</Label>
            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as any)}
              className="w-full bg-[#0F1020] border border-white/10 text-white rounded-xl h-10 px-3 text-xs outline-none focus:border-[#2B5BFF]"
            >
              <option value="demo_given">✨ Live Demo Demonstrated</option>
              <option value="followup_scheduled">📅 Follow-up Meeting Scheduled</option>
              <option value="payment_promised">💸 Promised Subscription Payment</option>
              <option value="onboarded">🎉 Onboarded & Trained On the Spot</option>
              <option value="not_interested">❌ Not Interested / Revisit Later</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Field Notes &amp; Observations *</Label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Demonstrated phone barcode scanning. Store owner Mr. Chudi was impressed. Will pay Pro subscription tomorrow."
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 text-xs outline-none focus:border-[#2B5BFF]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 font-bold">Next Follow-up Date (Optional)</Label>
            <Input
              type="date"
              value={nextFollowup}
              onChange={(e) => setNextFollowup(e.target.value)}
              className="bg-white/5 border-white/10 text-white rounded-xl h-10 text-xs"
            />
          </div>

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
              className="flex-1 bg-[#2B5BFF] hover:bg-[#1A4AEE] text-white font-bold rounded-2xl text-xs gap-1.5"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Saving Note..." : "Save Field Note"}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
