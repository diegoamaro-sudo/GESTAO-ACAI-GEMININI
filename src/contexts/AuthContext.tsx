import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type ConfiguracoesUsuario = {
  nome_loja: string;
  limite_mei: number;
  logo_url?: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  config: ConfiguracoesUsuario | null;
  loading: boolean;
  refetchConfig: () => void;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  config: null,
  loading: true,
  refetchConfig: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<ConfiguracoesUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('configuracoes_usuario')
      .select('nome_loja, limite_mei, logo_url')
      .eq('user_id', userId)
      .single();
    if (data) setConfig(data);
  }, []);

  useEffect(() => {
    setLoading(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchConfig(currentUser.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchConfig(currentUser.id);
      } else {
        setConfig(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchConfig]);

  const refetchConfig = () => {
    if (user) {
      fetchConfig(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, config, loading, refetchConfig }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};