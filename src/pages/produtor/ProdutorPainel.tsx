import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, LogOut, Package } from "lucide-react";
import { toast } from "sonner";

const ProdutorPainel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [produtor, setProdutor] = useState<{ nome: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Verificar se é produtor
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "produtor")
        .maybeSingle();

      if (!roleData) {
        toast.error("Acesso negado. Você não é um produtor.");
        navigate("/");
        return;
      }

      // Buscar dados do produtor
      const { data: produtorData } = await supabase
        .from("produtores")
        .select("nome")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setProdutor(produtorData);
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 shadow">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Painel do Produtor</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bem-vindo, {produtor?.nome || "Produtor"}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Gerencie seus fretes e encontre os melhores transportadores.
            </p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/transportadores")}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Truck className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Solicitar Frete</h3>
              <p className="text-sm text-muted-foreground">
                Escolha um transportador e solicite um frete
              </p>
              <Button className="mt-4 w-full">Solicitar Frete</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/mapa/transportadores")}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <MapPin className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Ver Transportadores</h3>
              <p className="text-sm text-muted-foreground">
                Visualize transportadores no mapa por região
              </p>
              <Button variant="outline" className="mt-4 w-full">Ver Transportadores</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/fretes")}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Package className="h-12 w-12 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Meus Fretes</h3>
              <p className="text-sm text-muted-foreground">
                Acompanhe o status dos seus fretes
              </p>
              <Button variant="secondary" className="mt-4 w-full">Meus Fretes</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ProdutorPainel;
