import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Store, Lock, ChevronDown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";

interface Shop {
  id: string;
  name: string;
  location: string;
}

export default function StaffLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, staff } = useStaffAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingShops, setIsFetchingShops] = useState(true);

  useEffect(() => {
    if (isAuthenticated && staff) {
      navigateToPortal(staff.role);
    }
  }, [isAuthenticated, staff]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("id, name, location")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      logError('StaffLogin.fetchShops', error);
      toast.error(getUserFriendlyError(error, 'load shops'));
    } finally {
      setIsFetchingShops(false);
    }
  };

  const navigateToPortal = (role: string) => {
    switch (role) {
      case "barber":
        navigate("/barber");
        break;
      case "cashier":
        navigate("/cashier");
        break;
      case "cleaner":
        navigate("/cleaner");
        break;
      default:
        navigate("/");
    }
  };

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setPin(numericValue);
  };

  const handleSubmit = async () => {
    if (!selectedShop) {
      toast.error("Please select a shop");
      return;
    }

    if (pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    setIsLoading(true);

    const result = await login(selectedShop.id, pin);

    if (result.success) {
      toast.success("Welcome back!");
    } else {
      toast.error(result.error || "Login failed");
      setPin("");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 py-8 safe-area-top safe-area-bottom">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-2xl tracking-wide">Staff Login</h1>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 space-y-6"
      >
        {/* Shop Selector */}
        <div className="space-y-2">
          <Label>Select Shop</Label>
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
              disabled={isFetchingShops}
              className="w-full h-14 rounded-xl bg-card border border-border px-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <Store className="w-5 h-5 text-muted-foreground" />
                {selectedShop ? (
                  <div>
                    <p className="font-medium text-foreground">{selectedShop.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedShop.location}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">
                    {isFetchingShops ? "Loading shops..." : "Choose your shop"}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isShopDropdownOpen ? "rotate-180" : ""}`} />
            </motion.button>

            <AnimatePresence>
              {isShopDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  {shops.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No shops available
                    </div>
                  ) : (
                    shops.map((shop) => (
                      <motion.button
                        key={shop.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedShop(shop);
                          setIsShopDropdownOpen(false);
                        }}
                        className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div className="text-left">
                          <p className="font-medium text-foreground">{shop.name}</p>
                          <p className="text-xs text-muted-foreground">{shop.location}</p>
                        </div>
                        {selectedShop?.id === shop.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </motion.button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* PIN Input */}
        <div className="space-y-2">
          <Label>Enter PIN</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="••••••"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              maxLength={6}
              className="h-14 rounded-xl pl-12 text-center text-2xl tracking-widest font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Enter your 4-6 digit PIN
          </p>
        </div>

        {/* PIN Keypad (optional visual) */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((key, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (key === "⌫") {
                  setPin(pin.slice(0, -1));
                } else if (key !== "" && pin.length < 6) {
                  setPin(pin + key);
                }
              }}
              disabled={key === ""}
              className={`h-14 rounded-xl font-display text-2xl ${
                key === ""
                  ? "invisible"
                  : key === "⌫"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary text-foreground active:bg-secondary/80"
              }`}
            >
              {key}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pt-6"
      >
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !selectedShop || pin.length < 4}
          className="w-full h-14 rounded-xl bg-gradient-gold text-primary-foreground font-bold text-lg"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </motion.div>
    </div>
  );
}
