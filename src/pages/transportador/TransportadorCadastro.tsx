import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Truck } from "lucide-react";
import { mascaraCPFouCNPJ, mascaraTelefone, validarCPFouCNPJ } from "@/lib/validations";

const tiposCaminhao = [
  { value: "truck", label: "Truck" },
  { value: "carreta", label: "Carreta" },
  { value: "bitruck", label: "Bitruck" },
  { value: "romeu_julieta", label: "Romeu e Julieta" }
];

const tiposAnimal = [
  { value: "bovino", label: "Bovinos" },
  { value: "equino", label: "Equinos" },
  { value: "ambos", label: "Bovinos e Equinos" },
  { value: "suino", label: "Suínos" },
  { value: "ovino", label: "Ovinos" },
  { value: "caprino", label: "Caprinos" }
];

const TransportadorCadastro = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nome: "",
    cpfCnpj: "",
    telefone: "",
    whatsapp: "",
    regiaoAtendimento: "",
    tipoAnimal: "",
    capacidadeAnimais: "",
    tipoCaminhao: "",
    placaVeiculo: "",
    latitude: "",
    longitude: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;
    
    if (field === "cpfCnpj") {
      formattedValue = mascaraCPFouCNPJ(value);
    } else if (field === "telefone" || field === "whatsapp") {
      formattedValue = mascaraTelefone(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    
    // Limpar erro do campo ao editar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) newErrors.email = "Email é obrigatório";
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Senha deve ter no mínimo 6 caracteres";
    }
    if (!formData.nome) newErrors.nome = "Nome é obrigatório";
    if (!formData.telefone) newErrors.telefone = "Telefone é obrigatório";
    if (!formData.regiaoAtendimento) newErrors.regiaoAtendimento = "Região é obrigatória";
    if (!formData.tipoAnimal) newErrors.tipoAnimal = "Tipo de animal é obrigatório";
    if (!formData.capacidadeAnimais) newErrors.capacidadeAnimais = "Capacidade é obrigatória";
    if (!formData.tipoCaminhao) newErrors.tipoCaminhao = "Tipo de caminhão é obrigatório";
    
    if (formData.cpfCnpj && !validarCPFouCNPJ(formData.cpfCnpj)) {
      newErrors.cpfCnpj = "CPF ou CNPJ inválido";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    setLoading(true);

    try {
      // 1. Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/transportador/painel`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Adicionar role de transportador
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "transportador" as const
        });

      if (roleError) throw roleError;

      // 3. Criar perfil do transportador
      const { error: transportadorError } = await supabase
        .from("transportadores")
        .insert({
          user_id: authData.user.id,
          nome: formData.nome,
          cpf_cnpj: formData.cpfCnpj.replace(/[^\d]/g, '') || null,
          telefone: formData.telefone,
          whatsapp: formData.whatsapp || formData.telefone,
          regiao_atendimento: formData.regiaoAtendimento,
          tipo_animal: formData.tipoAnimal,
          capacidade_animais: parseInt(formData.capacidadeAnimais) || null,
          tipo_caminhao: formData.tipoCaminhao,
          placa_veiculo: formData.placaVeiculo || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          ativo: true
        });

      if (transportadorError) throw transportadorError;

      toast.success("Cadastro realizado com sucesso!");
      navigate("/transportador/painel");

    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(error.message || "Erro ao realizar cadastro");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-earth flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Cadastro de Transportador</CardTitle>
                <CardDescription>Preencha seus dados para começar a receber fretes</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dados de Acesso */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados de Acesso</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="seu@email.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={errors.password ? "border-destructive" : ""}
                  />
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              </div>
            </div>

            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome / Razão Social *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    placeholder="Nome completo ou razão social"
                    className={errors.nome ? "border-destructive" : ""}
                  />
                  {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleChange("cpfCnpj", e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={errors.cpfCnpj ? "border-destructive" : ""}
                  />
                  {errors.cpfCnpj && <p className="text-xs text-destructive">{errors.cpfCnpj}</p>}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChange("telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={errors.telefone ? "border-destructive" : ""}
                  />
                  {errors.telefone && <p className="text-xs text-destructive">{errors.telefone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Dados do Veículo */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados do Veículo e Serviço</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="regiaoAtendimento">Região de Atuação *</Label>
                  <Input
                    id="regiaoAtendimento"
                    value={formData.regiaoAtendimento}
                    onChange={(e) => handleChange("regiaoAtendimento", e.target.value)}
                    placeholder="Ex: Sul de Minas, Triângulo Mineiro"
                    className={errors.regiaoAtendimento ? "border-destructive" : ""}
                  />
                  {errors.regiaoAtendimento && <p className="text-xs text-destructive">{errors.regiaoAtendimento}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoAnimal">Tipo de Animal *</Label>
                  <Select value={formData.tipoAnimal} onValueChange={(v) => handleChange("tipoAnimal", v)}>
                    <SelectTrigger className={errors.tipoAnimal ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposAnimal.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoAnimal && <p className="text-xs text-destructive">{errors.tipoAnimal}</p>}
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacidadeAnimais">Capacidade (animais) *</Label>
                  <Input
                    id="capacidadeAnimais"
                    type="number"
                    value={formData.capacidadeAnimais}
                    onChange={(e) => handleChange("capacidadeAnimais", e.target.value)}
                    placeholder="Ex: 20"
                    className={errors.capacidadeAnimais ? "border-destructive" : ""}
                  />
                  {errors.capacidadeAnimais && <p className="text-xs text-destructive">{errors.capacidadeAnimais}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoCaminhao">Tipo de Caminhão *</Label>
                  <Select value={formData.tipoCaminhao} onValueChange={(v) => handleChange("tipoCaminhao", v)}>
                    <SelectTrigger className={errors.tipoCaminhao ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposCaminhao.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoCaminhao && <p className="text-xs text-destructive">{errors.tipoCaminhao}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placaVeiculo">Placa do Veículo</Label>
                  <Input
                    id="placaVeiculo"
                    value={formData.placaVeiculo}
                    onChange={(e) => handleChange("placaVeiculo", e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                  />
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Localização (Opcional)</h3>
              <p className="text-xs text-muted-foreground">
                Informe suas coordenadas para aparecer no mapa de transportadores.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => handleChange("latitude", e.target.value)}
                    placeholder="Ex: -19.9167"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => handleChange("longitude", e.target.value)}
                    placeholder="Ex: -43.9345"
                  />
                </div>
              </div>
            </div>

            {/* Botões */}
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
                {loading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </div>

            {/* Link para login */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                  Fazer login
                </Button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportadorCadastro;
