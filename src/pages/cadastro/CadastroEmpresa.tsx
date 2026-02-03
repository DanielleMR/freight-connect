import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Building2 } from "lucide-react";
import { mascaraCNPJ, mascaraTelefone, validarCNPJ } from "@/lib/validations";

const CadastroEmpresa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    phone: ""
  });

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === "cnpj") formattedValue = mascaraCNPJ(value);
    if (field === "phone") formattedValue = mascaraTelefone(value);
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = "Nome da empresa é obrigatório";
    if (!formData.cnpj) newErrors.cnpj = "CNPJ é obrigatório";
    if (formData.cnpj && !validarCNPJ(formData.cnpj)) {
      newErrors.cnpj = "CNPJ inválido";
    }
    if (!formData.phone) newErrors.phone = "Telefone é obrigatório";
    if (!termsAccepted) newErrors.terms = "Você deve aceitar os termos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Você precisa estar logado para criar uma empresa");
      navigate("/auth?tipo=company_admin");
      return;
    }

    if (!validate()) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    setLoading(true);

    try {
      // Create company
      const { error: companyError } = await supabase
        .from('companies')
        .insert({
          admin_user_id: user.id,
          name: formData.name,
          cnpj: formData.cnpj.replace(/[^\d]/g, ''),
          phone: formData.phone
        });

      if (companyError) throw companyError;

      // Add capability
      const { error: capError } = await supabase
        .from('user_capabilities')
        .insert({
          user_id: user.id,
          capability: 'company_admin'
        });

      if (capError) throw capError;

      toast.success("Empresa cadastrada com sucesso!");
      navigate("/empresa/painel");
    } catch (error: any) {
      console.error("Error creating company:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("Este CNPJ já está cadastrado");
      } else {
        toast.error(error.message || "Erro ao cadastrar empresa");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Cadastro de Empresa</CardTitle>
                <CardDescription>Crie sua empresa de transporte</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Empresa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Razão social"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleChange("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={errors.cnpj ? "border-destructive" : ""}
                />
                {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => {
                    setTermsAccepted(checked as boolean);
                    if (errors.terms) setErrors(prev => ({ ...prev, terms: "" }));
                  }}
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                  Li e aceito os Termos de Uso e a Política de Privacidade
                </label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/")}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar Empresa"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CadastroEmpresa;
