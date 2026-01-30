import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Only redirect once and only when fully loaded with no user
    if (!loading && !user && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // Reset redirect flag when user logs in
  useEffect(() => {
    if (user) {
      hasRedirected.current = false;
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
