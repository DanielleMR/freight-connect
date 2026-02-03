import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Truck, User } from "lucide-react";
import { mascaraCPFouCNPJ, mascaraTelefone, validarCPFouCNPJ } from "@/lib/validations";

const estadosBrasileiros = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const cnhCategorias = ["A", "B", "C", "D", "E", "AB", "AC", "AD", "AE"];

interface ProfileSetupProps {
  profileType: 'producer' | 'driver';
}

const ProfileSetup = ({ profileType }: ProfileSetupProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Producer fields
  const [producerData, setProducerData] = useState({
    name: "",
    cpf_cnpj: "",
    phone: "",
    city: "",
    state: ""
  });

  // Driver fields
  const [driverData, setDriverData] = useState({
    name: "",
    cpf: "",
    phone: "",
    cnh_number: "",
    cnh_category: "",
    cnh_expiry: ""
  });

  const handleProducerChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === "cpf_cnpj") formattedValue = mascaraCPFouCNPJ(value);
    if (field === "phone") formattedValue = mascaraTelefone(value);
    setProducerData(prev => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const handleDriverChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === "cpf") formattedValue = mascaraCPFouCNPJ(value);
    if (field === "phone") formattedValue = mascaraTelefone(value);
    setDriverData(prev => ({ ...prev, [field]: formattedValue }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateProducer = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!producerData.name) newErrors.name = "Nome é obrigatório";
    if (!producerData.phone) newErrors.phone = "Telefone é obrigatório";
    if (producerData.cpf_cnpj && !validarCPFouCNPJ(producerData.cpf_cnpj)) {
      newErrors.cpf_cnpj = "CPF ou CNPJ inválido";
    }
    if (!termsAccepted) newErrors.terms = "Você deve aceitar os termos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDriver = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!driverData.name) newErrors.name = "Nome é obrigatório";
    if (!driverData.cpf) newErrors.cpf = "CPF é obrigatório";
    if (!driverData.phone) newErrors.phone = "Telefone é obrigatório";
    if (driverData.cpf && !validarCPFouCNPJ(driverData.cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    if (!termsAccepted) newErrors.terms = "Você deve aceitar os termos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const isValid = profileType === 'producer' ? validateProducer() : validateDriver();
    if (!isValid) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    setLoading(true);

    try {
      if (profileType === 'producer') {
        // Create producer profile
        const { error: profileError } = await supabase
          .from('producer_profiles')
          .insert({
            user_id: user.id,
            name: producerData.name,
            cpf_cnpj: producerData.cpf_cnpj.replace(/[^\d]/g, '') || null,
            phone: producerData.phone,
            city: producerData.city || null,
            state: producerData.state || null,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString()
          });

        if (profileError) throw profileError;

        // Add capability
        const { error: capError } = await supabase
          .from('user_capabilities')
          .insert({
            user_id: user.id,
            capability: 'producer'
          });

        if (capError) throw capError;

        toast.success("Perfil de produtor criado com sucesso!");
        navigate("/produtor/painel");
      } else {
        // Create driver profile
        const { error: profileError } = await supabase
          .from('driver_profiles')
          .insert({
            user_id: user.id,
            name: driverData.name,
            cpf: driverData.cpf.replace(/[^\d]/g, ''),
            phone: driverData.phone,
            cnh_number: driverData.cnh_number || null,
            cnh_category: driverData.cnh_category || null,
            cnh_expiry: driverData.cnh_expiry || null,
            terms_accepted: true,
            terms_accepted_at: new Date().toISOString()
          });

        if (profileError) throw profileError;

        // Add capability
        const { error: capError } = await supabase
          .from('user_capabilities')
          .insert({
            user_id: user.id,
            capability: 'driver'
          });

        if (capError) throw capError;

        toast.success("Perfil de motorista criado com sucesso!");
        navigate("/motorista/painel");
      }
    } catch (error: any) {
      console.error("Error creating profile:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("Este perfil já existe. Tente fazer login.");
      } else {
        toast.error(error.message || "Erro ao criar perfil");
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
                {profileType === 'producer' ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Truck className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <CardTitle>
                  {profileType === 'producer' ? 'Cadastro de Produtor' : 'Cadastro de Motorista'}
                </CardTitle>
                <CardDescription>
                  {profileType === 'producer' 
                    ? 'Preencha seus dados para solicitar fretes' 
                    : 'Preencha seus dados para começar a aceitar fretes'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {profileType === 'producer' ? (
              <>
                {/* Producer Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome / Razão Social *</Label>
                      <Input
                        id="name"
                        value={producerData.name}
                        onChange={(e) => handleProducerChange("name", e.target.value)}
                        placeholder="Nome completo ou razão social"
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
                      <Input
                        id="cpf_cnpj"
                        value={producerData.cpf_cnpj}
                        onChange={(e) => handleProducerChange("cpf_cnpj", e.target.value)}
                        placeholder="000.000.000-00"
                        className={errors.cpf_cnpj ? "border-destructive" : ""}
                      />
                      {errors.cpf_cnpj && <p className="text-xs text-destructive">{errors.cpf_cnpj}</p>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        value={producerData.phone}
                        onChange={(e) => handleProducerChange("phone", e.target.value)}
                        placeholder="(00) 00000-0000"
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={producerData.city}
                        onChange={(e) => handleProducerChange("city", e.target.value)}
                        placeholder="Sua cidade"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select value={producerData.state} onValueChange={(v) => handleProducerChange("state", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosBrasileiros.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Driver Form */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={driverData.name}
                        onChange={(e) => handleDriverChange("name", e.target.value)}
                        placeholder="Nome completo"
                        className={errors.name ? "border-destructive" : ""}
                      />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        value={driverData.cpf}
                        onChange={(e) => handleDriverChange("cpf", e.target.value)}
                        placeholder="000.000.000-00"
                        className={errors.cpf ? "border-destructive" : ""}
                      />
                      {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={driverData.phone}
                      onChange={(e) => handleDriverChange("phone", e.target.value)}
                      placeholder="(00) 00000-0000"
                      className={errors.phone ? "border-destructive" : ""}
                    />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">CNH (Carteira de Habilitação)</h3>
                  <p className="text-xs text-muted-foreground">
                    Sua CNH será validada pelo administrador antes de você poder aceitar fretes.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cnh_number">Número da CNH</Label>
                      <Input
                        id="cnh_number"
                        value={driverData.cnh_number}
                        onChange={(e) => handleDriverChange("cnh_number", e.target.value)}
                        placeholder="00000000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnh_category">Categoria</Label>
                      <Select value={driverData.cnh_category} onValueChange={(v) => handleDriverChange("cnh_category", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {cnhCategorias.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnh_expiry">Validade</Label>
                      <Input
                        id="cnh_expiry"
                        type="date"
                        value={driverData.cnh_expiry}
                        onChange={(e) => handleDriverChange("cnh_expiry", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Terms */}
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
                  Li e aceito os <span className="text-primary underline">Termos de Uso</span> e a{" "}
                  <span className="text-primary underline">Política de Privacidade</span>
                </label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}
            </div>

            {/* Submit */}
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
                {loading ? "Salvando..." : "Completar Cadastro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetup;
