import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  const navItems = [
    { path: "/admin/transportadores", label: "Transportadores" },
    { path: "/admin/produtores", label: "Produtores" },
    { path: "/admin/fretes", label: "Fretes" },
    { path: "/admin/operacoes", label: "Operações" },
    { path: "/admin/contratos", label: "Contratos" },
    { path: "/admin/documentos", label: "Documentos" },
    { path: "/admin/chats", label: "Chats" },
    { path: "/admin/financeiro", label: "Financeiro" },
    { path: "/admin/emails", label: "Emails" },
    { path: "/admin/denuncias", label: "Denúncias" },
    { path: "/admin/auditoria", label: "Auditoria" },
    { path: "/admin/relatorio", label: "Relatório" },
    { path: "/admin/configuracoes", label: "Config" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Painel Admin</h1>
          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  location.pathname === item.path
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default AdminLayout;
