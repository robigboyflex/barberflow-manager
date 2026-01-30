import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 safe-area-top safe-area-bottom">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-3xl bg-gradient-gold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20"
        >
          <span className="text-5xl font-display text-primary-foreground">404</span>
        </motion.div>
        <h1 className="text-3xl font-display text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="gap-2 h-12 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="gap-2 h-12 rounded-xl bg-gradient-gold text-primary-foreground"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
