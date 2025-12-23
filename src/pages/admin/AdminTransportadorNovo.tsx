import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

const AdminTransportadorNovo = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [nome, setNome] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipoCaminhao, setTipoCaminhao] = useState("");
  const [capacidadeAnimais, setCapacidadeAnimais] = useState("");
  const [regiaoAtendimento, setRegiaoAtendimento] = useState("");
  const [documentoCaminhaoOk, setDocumentoCaminhaoOk] = useState(false);
  const [documentacaoSanitariaOk, setDocumentacaoSanitariaOk] = useState(false);
  const [ativo, setAtivo] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke('admin/transportadores', {
        method: 'POST',
        body: {
          nome,
          telefone,
          placa_veiculo: tipoCaminhao || null,
          capacidade_animais: capacidadeAnimais ? parseInt(capacidadeAnimais) : null,
          regiao_atendimento: regiaoAtendimento || null,
          ativo,
        },
      });

      if (response.error) throw response.error;

      toast.success("Transportador cadastrado com sucesso!");
      navigate("/admin/transportadores");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar transportador");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/transportadores");
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Novo Transportador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
              <Input
                id="cpfCnpj"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoCaminhao">Tipo de Caminhão</Label>
              <Select value={tipoCaminhao} onValueChange={setTipoCaminhao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="carreta">Carreta</SelectItem>
                  <SelectItem value="bi-truck">Bi-Truck</SelectItem>
                  <SelectItem value="carreta-ls">Carreta LS</SelectItem>
                  <SelectItem value="rodotrem">Rodotrem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidadeAnimais">Capacidade de Animais</Label>
              <Input
                id="capacidadeAnimais"
                type="number"
                value={capacidadeAnimais}
                onChange={(e) => setCapacidadeAnimais(e.target.value)}
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="regiaoAtendimento">Região de Atendimento</Label>
              <Input
                id="regiaoAtendimento"
                value={regiaoAtendimento}
                onChange={(e) => setRegiaoAtendimento(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="documentoCaminhaoOk"
                checked={documentoCaminhaoOk}
                onCheckedChange={(checked) => setDocumentoCaminhaoOk(checked === true)}
              />
              <Label htmlFor="documentoCaminhaoOk">Documento do Caminhão OK</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="documentacaoSanitariaOk"
                checked={documentacaoSanitariaOk}
                onCheckedChange={(checked) => setDocumentacaoSanitariaOk(checked === true)}
              />
              <Label htmlFor="documentacaoSanitariaOk">Documentação Sanitária OK</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={ativo}
                onCheckedChange={(checked) => setAtivo(checked === true)}
              />
              <Label htmlFor="ativo">Ativo</Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminTransportadorNovo;
