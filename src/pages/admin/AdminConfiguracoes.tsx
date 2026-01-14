import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, Flag, Plus, Trash2, Edit, AlertCircle, CheckCircle } from 'lucide-react';
import { invalidateFeatureFlagsCache } from '@/hooks/useFeatureFlag';

interface FeatureFlag {
  chave: string;
  ativo: boolean;
  descricao: string | null;
}

export default function AdminConfiguracoes() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // New flag form
  const [dialogOpen, setDialogOpen] = useState(false);
  const [novaChave, setNovaChave] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoAtivo, setNovoAtivo] = useState(true);
  
  // Edit flag
  const [editFlag, setEditFlag] = useState<FeatureFlag | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDescricao, setEditDescricao] = useState('');

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('chave');

    if (error) {
      toast.error('Erro ao carregar feature flags');
      return;
    }

    setFlags(data || []);
    setLoading(false);
  };

  const handleToggleFlag = async (chave: string, novoValor: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ ativo: novoValor })
      .eq('chave', chave);

    if (error) {
      toast.error('Erro ao atualizar flag');
      return;
    }

    // Registrar auditoria
    await supabase.rpc('registrar_auditoria', {
      p_acao: 'toggle_feature_flag',
      p_tabela: 'feature_flags',
      p_registro_id: null,
      p_dados_anteriores: { chave, ativo: !novoValor },
      p_dados_novos: { chave, ativo: novoValor }
    });

    invalidateFeatureFlagsCache();
    toast.success(`Flag "${chave}" ${novoValor ? 'ativada' : 'desativada'}`);
    fetchFlags();
  };

  const handleCreateFlag = async () => {
    if (!novaChave.trim()) {
      toast.error('Chave é obrigatória');
      return;
    }

    // Validar formato da chave (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(novaChave)) {
      toast.error('Chave deve estar em snake_case (ex: chat_ativo)');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('feature_flags')
      .insert({
        chave: novaChave,
        ativo: novoAtivo,
        descricao: novaDescricao || null
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Esta chave já existe');
      } else {
        toast.error('Erro ao criar flag');
      }
      setSubmitting(false);
      return;
    }

    // Registrar auditoria
    await supabase.rpc('registrar_auditoria', {
      p_acao: 'criar_feature_flag',
      p_tabela: 'feature_flags',
      p_registro_id: null,
      p_dados_anteriores: null,
      p_dados_novos: { chave: novaChave, ativo: novoAtivo, descricao: novaDescricao }
    });

    invalidateFeatureFlagsCache();
    toast.success('Feature flag criada!');
    setDialogOpen(false);
    setNovaChave('');
    setNovaDescricao('');
    setNovoAtivo(true);
    setSubmitting(false);
    fetchFlags();
  };

  const handleDeleteFlag = async (chave: string) => {
    if (!confirm(`Tem certeza que deseja excluir a flag "${chave}"?`)) return;

    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('chave', chave);

    if (error) {
      toast.error('Erro ao excluir flag');
      return;
    }

    // Registrar auditoria
    await supabase.rpc('registrar_auditoria', {
      p_acao: 'excluir_feature_flag',
      p_tabela: 'feature_flags',
      p_registro_id: null,
      p_dados_anteriores: { chave },
      p_dados_novos: null
    });

    invalidateFeatureFlagsCache();
    toast.success('Flag excluída');
    fetchFlags();
  };

  const handleEditFlag = async () => {
    if (!editFlag) return;

    const { error } = await supabase
      .from('feature_flags')
      .update({ descricao: editDescricao || null })
      .eq('chave', editFlag.chave);

    if (error) {
      toast.error('Erro ao atualizar flag');
      return;
    }

    invalidateFeatureFlagsCache();
    toast.success('Flag atualizada');
    setEditDialogOpen(false);
    setEditFlag(null);
    fetchFlags();
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setEditFlag(flag);
    setEditDescricao(flag.descricao || '');
    setEditDialogOpen(true);
  };

  // Flags críticas do sistema
  const criticalFlags = ['chat_ativo', 'pagamentos_ativo', 'cadastro_ativo', 'fretes_ativo'];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações
          </h1>
          <p className="text-muted-foreground">Controle operacional do sistema</p>
        </div>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Feature Flags
                </CardTitle>
                <CardDescription>
                  Ative ou desative funcionalidades do sistema em tempo real
                </CardDescription>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Nova Flag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Feature Flag</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="chave">Chave (snake_case)</Label>
                      <Input
                        id="chave"
                        value={novaChave}
                        onChange={(e) => setNovaChave(e.target.value.toLowerCase())}
                        placeholder="ex: chat_ativo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={novaDescricao}
                        onChange={(e) => setNovaDescricao(e.target.value)}
                        placeholder="Descrição da funcionalidade..."
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ativo">Iniciar ativada</Label>
                      <Switch 
                        id="ativo" 
                        checked={novoAtivo} 
                        onCheckedChange={setNovoAtivo} 
                      />
                    </div>
                    <Button onClick={handleCreateFlag} className="w-full" disabled={submitting}>
                      {submitting ? 'Criando...' : 'Criar Flag'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : flags.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Nenhuma feature flag configurada.</p>
                <p className="text-sm text-muted-foreground">
                  Crie flags para controlar funcionalidades em tempo real.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((flag) => {
                    const isCritical = criticalFlags.includes(flag.chave);
                    return (
                      <TableRow key={flag.chave} className={isCritical ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {flag.chave}
                          </code>
                          {isCritical && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Crítico
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {flag.descricao || '-'}
                        </TableCell>
                        <TableCell>
                          {flag.ativo ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={flag.ativo}
                            onCheckedChange={(checked) => handleToggleFlag(flag.chave, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(flag)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {!isCritical && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteFlag(flag.chave)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Flag: {editFlag?.chave}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea
                  id="edit-descricao"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  placeholder="Descrição da funcionalidade..."
                />
              </div>
              <Button onClick={handleEditFlag} className="w-full">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
