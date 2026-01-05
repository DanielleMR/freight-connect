import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Package, LogOut, User, Star, History, CheckCircle, XCircle, Play, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/ui/notification-bell";
import { StatusBadge } from "@/components/ui/status-badge";
import { StarRating, RatingSummary } from "@/components/ui/star-rating";
import { mascaraTelefone, mascaraCPFouCNPJ } from "@/lib/validations";

interface Transportador {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string | null;
  cpf_cnpj: string | null;
  regiao_atendimento: string | null;
  capacidade_animais: number | null;
  tipo_caminhao: string | null;
  tipo_animal: string | null;
  placa_veiculo: string | null;
  ativo: boolean;
}

interface Frete {
  id: string;
  origem: string | null;
  destino: string | null;
  quantidade_animais: number | null;
  tipo_animal: string | null;
  valor_frete: number | null;
  data_prevista: string | null;
  status: string;
  descricao: string | null;
  created_at: string;
  produtor_id: string;
  produtor?: {
    nome: string;
    telefone: string;
    cidade: string | null;
    estado: string | null;
  } | null;
}

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
}

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

const TransportadorPainel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transportador, setTransportador] = useState<Transportador | null>(null);
  const [fretes, setFretes] = useState<Frete[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Transportador>>({});
  const [contatoVisivel, setContatoVisivel] = useState<Record<string, boolean>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/auth");
      return;
    }

    // Verificar se é transportador
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "transportador")
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado. Você não é um transportador.");
      navigate("/");
      return;
    }

    // Buscar dados do transportador
    const { data: transportadorData } = await supabase
      .from("transportadores")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (transportadorData) {
      setTransportador(transportadorData);
      setEditData(transportadorData);
      fetchFretes(transportadorData.id);
      fetchAvaliacoes(transportadorData.id);
    }
    setLoading(false);
  };

  const fetchFretes = async (transportadorId: string) => {
    const { data } = await supabase
      .from("fretes")
      .select("*")
      .eq("transportador_id", transportadorId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch produtor data for each frete
      const fretesComProdutor = await Promise.all(
        data.map(async (frete) => {
          const { data: produtorData } = await supabase
            .from("produtores")
            .select("nome, telefone, cidade, estado")
            .eq("id", frete.produtor_id)
            .maybeSingle();
          
          return {
            ...frete,
            produtor: produtorData
          };
        })
      );
      setFretes(fretesComProdutor as Frete[]);
    }
  };

  const fetchAvaliacoes = async (transportadorId: string) => {
    const { data } = await supabase
      .from("avaliacoes")
      .select("*")
      .eq("transportador_id", transportadorId)
      .order("created_at", { ascending: false });

    if (data) setAvaliacoes(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUpdateStatus = async (freteId: string, newStatus: "aceito" | "recusado" | "em_andamento" | "concluido") => {
    const { error } = await supabase
      .from("fretes")
      .update({ status: newStatus })
      .eq("id", freteId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Frete ${newStatus === 'aceito' ? 'aceito' : newStatus === 'recusado' ? 'recusado' : 'atualizado'}!`);
      if (transportador) fetchFretes(transportador.id);
    }
  };

  const handleSaveProfile = async () => {
    if (!transportador) return;

    const { error } = await supabase
      .from("transportadores")
      .update({
        nome: editData.nome,
        telefone: editData.telefone,
        whatsapp: editData.whatsapp,
        regiao_atendimento: editData.regiao_atendimento,
        capacidade_animais: editData.capacidade_animais,
        tipo_caminhao: editData.tipo_caminhao,
        tipo_animal: editData.tipo_animal,
        placa_veiculo: editData.placa_veiculo,
      })
      .eq("id", transportador.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Perfil atualizado!");
      setTransportador({ ...transportador, ...editData } as Transportador);
      setEditMode(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const mediaAvaliacoes = avaliacoes.length > 0
    ? avaliacoes.reduce((acc, a) => acc + a.nota, 0) / avaliacoes.length
    : 0;

  const fretesPendentes = fretes.filter(f => f.status === "solicitado");
  const fretesAtivos = fretes.filter(f => ["aceito", "em_andamento"].includes(f.status));
  const fretesHistorico = fretes.filter(f => ["concluido", "recusado"].includes(f.status));

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
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6" />
            <h1 className="text-xl font-bold">Painel do Transportador</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Card de Boas-vindas */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Olá, {transportador?.nome}!</CardTitle>
                <CardDescription className="mt-1">
                  {transportador?.regiao_atendimento && `Região: ${transportador.regiao_atendimento}`}
                </CardDescription>
              </div>
              {avaliacoes.length > 0 && (
                <RatingSummary rating={mediaAvaliacoes} totalReviews={avaliacoes.length} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{fretesPendentes.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{fretesAtivos.length}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{fretesHistorico.filter(f => f.status === 'concluido').length}</p>
                <p className="text-xs text-muted-foreground">Concluídos</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{mediaAvaliacoes.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avaliação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pendentes" className="flex gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden md:inline">Pendentes</span>
              {fretesPendentes.length > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 rounded-full">
                  {fretesPendentes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="ativos" className="flex gap-2">
              <Play className="h-4 w-4" />
              <span className="hidden md:inline">Em Andamento</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex gap-2">
              <History className="h-4 w-4" />
              <span className="hidden md:inline">Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="perfil" className="flex gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Perfil</span>
            </TabsTrigger>
          </TabsList>

          {/* Fretes Pendentes */}
          <TabsContent value="pendentes" className="space-y-4">
            {fretesPendentes.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum frete pendente no momento
                </CardContent>
              </Card>
            ) : (
              fretesPendentes.map((frete) => (
                <Card key={frete.id} className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={frete.status} />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(frete.created_at)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {frete.origem} → {frete.destino}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <span>📦 {frete.quantidade_animais || "-"} animais</span>
                          <span>🐄 {frete.tipo_animal || "-"}</span>
                          <span>💰 {formatCurrency(frete.valor_frete)}</span>
                          <span>📅 {formatDate(frete.data_prevista)}</span>
                        </div>
                        {frete.descricao && (
                          <p className="text-sm mt-2 text-muted-foreground">{frete.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleUpdateStatus(frete.id, "aceito")}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aceitar
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleUpdateStatus(frete.id, "recusado")}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Fretes Ativos */}
          <TabsContent value="ativos" className="space-y-4">
            {fretesAtivos.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum frete em andamento
                </CardContent>
              </Card>
            ) : (
              fretesAtivos.map((frete) => (
                <Card key={frete.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <StatusBadge status={frete.status} />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {frete.origem} → {frete.destino}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                          <span>📦 {frete.quantidade_animais || "-"} animais</span>
                          <span>🐄 {frete.tipo_animal || "-"}</span>
                          <span>💰 {formatCurrency(frete.valor_frete)}</span>
                          <span>📅 {formatDate(frete.data_prevista)}</span>
                        </div>

                        {/* Contato do produtor - dados reais */}
                        {(frete.status === 'aceito' || frete.status === 'em_andamento') && frete.produtor && (
                          <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                              Contato do Produtor
                            </p>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">{frete.produtor.nome}</p>
                              {frete.produtor.cidade && frete.produtor.estado && (
                                <p className="text-muted-foreground">
                                  {frete.produtor.cidade}, {frete.produtor.estado}
                                </p>
                              )}
                              <div className="flex gap-3 mt-2">
                                <a 
                                  href={`tel:${frete.produtor.telefone}`}
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Phone className="h-4 w-4" />
                                  {frete.produtor.telefone}
                                </a>
                                <a 
                                  href={`https://wa.me/55${frete.produtor.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-green-600 hover:underline"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {frete.status === 'aceito' && (
                          <Button 
                            onClick={() => handleUpdateStatus(frete.id, "em_andamento")}
                            className="gap-2"
                          >
                            <Play className="h-4 w-4" />
                            Iniciar
                          </Button>
                        )}
                        {frete.status === 'em_andamento' && (
                          <Button 
                            onClick={() => handleUpdateStatus(frete.id, "concluido")}
                            className="gap-2"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="space-y-4">
            {fretesHistorico.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhum frete no histórico
                </CardContent>
              </Card>
            ) : (
              fretesHistorico.map((frete) => (
                <Card key={frete.id} className={`border-l-4 ${frete.status === 'concluido' ? 'border-l-gray-400' : 'border-l-red-400'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={frete.status} />
                          <span className="text-sm text-muted-foreground">
                            {formatDate(frete.created_at)}
                          </span>
                        </div>
                        <h3 className="font-medium">
                          {frete.origem} → {frete.destino}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {frete.quantidade_animais} animais • {formatCurrency(frete.valor_frete)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Meu Perfil</CardTitle>
                  <Button 
                    variant={editMode ? "default" : "outline"}
                    onClick={() => editMode ? handleSaveProfile() : setEditMode(true)}
                  >
                    {editMode ? "Salvar" : "Editar"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input 
                      value={editData.nome || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input 
                      value={editData.telefone || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, telefone: mascaraTelefone(e.target.value) }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input 
                      value={editData.whatsapp || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, whatsapp: mascaraTelefone(e.target.value) }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Região de Atendimento</Label>
                    <Input 
                      value={editData.regiao_atendimento || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, regiao_atendimento: e.target.value }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Animal</Label>
                    <Select 
                      value={editData.tipo_animal || ""} 
                      onValueChange={(v) => setEditData(prev => ({ ...prev, tipo_animal: v }))}
                      disabled={!editMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposAnimal.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacidade</Label>
                    <Input 
                      type="number"
                      value={editData.capacidade_animais || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, capacidade_animais: parseInt(e.target.value) || null }))}
                      disabled={!editMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Caminhão</Label>
                    <Select 
                      value={editData.tipo_caminhao || ""} 
                      onValueChange={(v) => setEditData(prev => ({ ...prev, tipo_caminhao: v }))}
                      disabled={!editMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCaminhao.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placa</Label>
                    <Input 
                      value={editData.placa_veiculo || ""} 
                      onChange={(e) => setEditData(prev => ({ ...prev, placa_veiculo: e.target.value.toUpperCase() }))}
                      disabled={!editMode}
                    />
                  </div>
                </div>

                {/* Avaliações Recebidas */}
                {avaliacoes.length > 0 && (
                  <div className="pt-6 border-t">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Avaliações Recebidas
                    </h3>
                    <div className="space-y-3">
                      {avaliacoes.slice(0, 5).map((avaliacao) => (
                        <div key={avaliacao.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <StarRating rating={avaliacao.nota} size="sm" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(avaliacao.created_at)}
                            </span>
                          </div>
                          {avaliacao.comentario && (
                            <p className="text-sm text-muted-foreground">{avaliacao.comentario}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {editMode && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditData(transportador || {});
                      setEditMode(false);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TransportadorPainel;
