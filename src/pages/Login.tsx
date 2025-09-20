import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Package } from 'lucide-react';

const Login = () => {
  const { session, config } = useAuth();

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center gap-4">
          {config?.logo_url ? (
            <img src={config.logo_url} alt="Logo da Loja" className="h-24 w-auto object-contain" />
          ) : (
            <div className="h-16 w-16 bg-primary rounded-lg flex items-center justify-center">
              <Package className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
          <h2 className="text-2xl font-bold text-center text-primary">AÇAÍ DO CHAVES</h2>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="dark"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu endereço de e-mail',
                password_label: 'Sua senha',
                button_label: 'Entrar',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entre',
              },
               sign_up: {
                email_label: 'Seu endereço de e-mail',
                password_label: 'Sua senha',
                button_label: 'Registrar',
                social_provider_text: 'Registrar com {{provider}}',
                link_text: 'Não tem uma conta? Registre-se',
              },
              forgotten_password: {
                email_label: 'Seu endereço de e-mail',
                button_label: 'Enviar instruções de recuperação',
                link_text: 'Esqueceu sua senha?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;