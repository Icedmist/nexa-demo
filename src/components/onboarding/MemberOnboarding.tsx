import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  ShieldCheck, 
  Shield, 
  User as UserIcon, 
  ArrowRight, 
  Loader2,
  Package,
  ShoppingCart,
  MessageSquare,
  X,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MemberOnboardingProps {
  name: string;
  role: string;
  onComplete: () => Promise<void> | void;
}

const ROLE_INFO: Record<string, { title: string; desc: string; icon: LucideIcon; color: string }> = {
  admin: {
    title: "Store Administrator",
    desc: "You have full control over the store, settings, and team management.",
    icon: ShieldCheck,
    color: "text-teal-600 bg-teal-50"
  },
  manager: {
    title: "Inventory Manager",
    desc: "You can manage stock, process purchase orders, and view analytics.",
    icon: Shield,
    color: "text-amber-600 bg-amber-50"
  },
  requestor: {
    title: "Store Requestor",
    desc: "You can view the catalog and create requests for stock movements.",
    icon: UserIcon,
    color: "text-blue-600 bg-blue-50"
  }
};

const STEPS = [
  { icon: Package, title: "Browse Catalog", desc: "View all items and check their current stock levels." },
  { icon: ShoppingCart, title: "Create Requests", desc: "Submit orders or requests for approval by managers." },
  { icon: MessageSquare, title: "Collaborate", desc: "Add notes to movements and stay in sync with your team." }
];

export function MemberOnboarding({ name, role, onComplete }: MemberOnboardingProps) {
  const info = ROLE_INFO[role] || ROLE_INFO.requestor;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onComplete();
    } catch (err) {
      console.error("Onboarding completion error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-4 sm:p-6 overflow-y-auto min-h-screen">
      <div className="w-full flex-1 flex items-center justify-center my-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl relative my-auto"
        >
          <button
            type="button"
            onClick={handleStart}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            title="Dismiss & Enter Workspace"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center space-y-2 mb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome, {name}!</h2>
            <p className="text-sm text-muted-foreground">You've been added to the store command center.</p>
          </div>

          <div className={cn("rounded-xl border p-4 mb-6 flex items-start gap-4", info.color.split(" ")[1])}>
            <div className={cn("p-2 rounded-lg shrink-0", info.color.split(" ")[0], "bg-white dark:bg-slate-900 shadow-xs")}>
              <info.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{info.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{info.desc}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">What you can do</h4>
            {STEPS.map((step, i) => (
              <motion.div 
                key={step.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + (i * 0.08) }}
                className="flex items-center gap-3 p-2 group"
              >
                <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors shrink-0">
                  <step.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium leading-none">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <Button 
            onClick={handleStart} 
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold gap-2 shadow-md cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Getting Ready...</span>
              </>
            ) : (
              <>
                Get Started <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-[11px] text-center text-muted-foreground mt-4">
            By continuing, you agree to follow the store's inventory policies.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

