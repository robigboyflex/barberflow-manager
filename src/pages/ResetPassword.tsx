import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { getUserFriendlyError } from "@/lib/errorHandler";

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
      setChecking(false);
    });

    // Also check hash for type=recovery
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }
    
    // Fallback timeout
    const timeout = setTimeout(() => setChecking(false), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = resetSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
    } catch (err) {
      setError(getUserFriendlyError(err, "reset password"));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
          <CheckCircle className="w-20 h-20 text-primary mb-4" />
        </motion.div>
        <h1 className="text-2xl font-display text-foreground mb-2">Password Updated!</h1>
        <p className="text-muted-foreground text-center mb-6">Your password has been reset successfully.</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/auth?mode=signin")}
          className="px-8 h-14 rounded-2xl bg-gradient-gold text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
        >
          Sign In
        </motion.button>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-display text-foreground mb-2">Invalid Reset Link</h1>
        <p className="text-muted-foreground text-center mb-6">
          This link is invalid or has expired. Please request a new password reset.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/auth?mode=signin")}
          className="text-primary font-medium"
        >
          Back to Sign In
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8 safe-area-top safe-area-bottom">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/auth?mode=signin")}
        className="flex items-center gap-2 text-muted-foreground mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </motion.button>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-lg shadow-primary/20 mb-6 mx-auto"
      >
        <Lock className="w-10 h-10 text-primary-foreground" strokeWidth={1.5} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-display text-foreground text-center mb-2"
      >
        Set New Password
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center mb-8"
      >
        Enter your new password below
      </motion.p>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-auto space-y-4"
      >
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-card border-border text-base"
            disabled={loading}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-14 pl-12 rounded-2xl bg-card border-border text-base"
            disabled={loading}
          />
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-gradient-gold text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Password"
          )}
        </motion.button>
      </motion.form>
    </div>
  );
}
