import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Settings } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Apenas administradores.");
      }

      toast.success("Login realizado com sucesso!");
      navigate("/admin/transportadores");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupTestAdmin = async () => {
    setSettingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-test-admin');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Admin de teste configurado!");
        setEmail(data.credentials.email);
        setPassword(data.credentials.password);
      } else {
        throw new Error(data?.error || "Erro ao configurar admin");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSettingUp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <CardTitle>Painel Administrativo</CardTitle>
          </div>
          <CardDescription>
            Acesso restrito a administradores do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ambiente de teste
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={setupTestAdmin}
            disabled={settingUp}
          >
            <Settings className="h-4 w-4" />
            {settingUp ? "Configurando..." : "Criar Admin de Teste"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Clique para criar automaticamente um usuário admin para testes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
