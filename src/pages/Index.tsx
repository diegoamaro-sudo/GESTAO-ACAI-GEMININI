import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Bem-vindo ao Dashboard</h1>
        <p className="text-xl text-gray-600">
          Em breve, aqui estarão todas as informações da sua loja.
        </p>
        <Button onClick={handleLogout} className="mt-8">
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Index;