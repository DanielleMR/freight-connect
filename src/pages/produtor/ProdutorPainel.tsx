import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, LogOut, Package, Bell } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/ui/notification-bell";
import { StatusBadge } from "@/components/ui/status-badge";
import { Database } from "@/integrations/supabase/types";

type FreteStatus = Database['public']['Enums']['frete_status'];

interface Frete {
  id: string;
  status: FreteStatus;
  origem: string | null;
  destino: string | null;
  created_at: string;
}

const ProdutorPainel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [produtor, setProdutor] = useState<{ nome: string; id: string } | null>(null);
  const [fretesRecentes, setFretesRecentes] = useState<Frete[]>([]);
  const [stats, setStats] = useState({ total: 0, pendentes: 0, aceitos: 0, concluidos: 0 });

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
        .select("nome, id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (produtorData) {
        setProdutor(produtorData);
        await fetchFretes(produtorData.id);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const fetchFretes = async (produtorId: string) => {
    const { data: fretes } = await supabase
      .from("fretes")
      .select("id, status, origem, destino, created_at")
      .eq("produtor_id", produtorId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (fretes) {
      setFretesRecentes(fretes);
      
      // Calcular estatísticas
      const { count: total } = await supabase
        .from("fretes")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", produtorId);
      
      const { count: pendentes } = await supabase
        .from("fretes")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", produtorId)
        .eq("status", "solicitado");
      
      const { count: aceitos } = await supabase
        .from("fretes")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", produtorId)
        .in("status", ["aceito", "em_andamento"]);
      
      const { count: concluidos } = await supabase
        .from("fretes")
        .select("*", { count: "exact", head: true })
        .eq("produtor_id", produtorId)
        .eq("status", "concluido");

      setStats({
        total: total || 0,
        pendentes: pendentes || 0,
        aceitos: aceitos || 0,
        concluidos: concluidos || 0
      });
    }
  };

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
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Bem-vindo, {produtor?.nome || "Produtor"}!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Gerencie seus fretes e encontre os melhores transportadores.
            </p>
            
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.aceitos}</p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.concluidos}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações principais */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/mapa/transportadores")}>
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
                Visualize transportadores disponíveis
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

        {/* Fretes recentes */}
        {fretesRecentes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fretes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fretesRecentes.map((frete) => (
                  <div 
                    key={frete.id} 
                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                    onClick={() => navigate("/fretes")}
                  >
                    <div>
                      <p className="font-medium">{frete.origem} → {frete.destino}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(frete.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <StatusBadge status={frete.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ProdutorPainel;
