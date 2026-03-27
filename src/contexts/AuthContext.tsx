import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      const nextUserId = nextSession?.user?.id ?? null;
      const prevUserId = currentUserIdRef.current;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      // Only clear/invalidate queries when the user actually changes
      if (prevUserId && !nextUserId) {
        // Signed out — clear all cached data
        queryClient.clear();
      } else if (nextUserId && prevUserId !== nextUserId) {
        // Different user signed in — invalidate stale data (no immediate refetch storm)
        queryClient.removeQueries();
      }

      currentUserIdRef.current = nextUserId;
    };

    // 1. Set up listener FIRST (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!initializedRef.current) {
        // During init, only process the INITIAL_SESSION event
        if (event === 'INITIAL_SESSION') {
          applySession(newSession);
          initializedRef.current = true;
        }
        return;
      }

      // After init, process sign-in/out/token refresh
      if (event === 'SIGNED_OUT') {
        applySession(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        applySession(newSession);
      }
    });

    // 2. Fallback: if INITIAL_SESSION never fires within 3s, manually fetch
    const fallbackTimer = setTimeout(async () => {
      if (!initializedRef.current && isMounted) {
        try {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (!initializedRef.current && isMounted) {
            applySession(s);
            initializedRef.current = true;
          }
        } catch {
          if (!initializedRef.current && isMounted) {
            applySession(null);
            initializedRef.current = true;
          }
        }
      }
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, [queryClient]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      }
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
