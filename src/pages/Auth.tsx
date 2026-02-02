import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Tractor, Truck, ArrowLeft, AlertTriangle } from 'lucide-react';
import { getUserRolesByUserId, AppRole } from '@/hooks/useUserRole';

type UserType = 'produtor' | 'transportador';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const selectedType = searchParams.get('tipo') as UserType | null;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await redirectByRole(session.user.id);
      }
      setCheckingSession(false);
    };

    checkExistingSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Validate role matches selected type
        if (selectedType) {
          const roles = await getUserRolesByUserId(session.user.id);
          if (!roles.includes(selectedType as AppRole)) {
            // User logged in but doesn't have the selected role
            await supabase.auth.signOut();
            const tipoNome = selectedType === 'produtor' ? 'Proprietário de Animais' : 'Caminhoneiro';
            const tipoReal = roles.includes('produtor') ? 'Proprietário de Animais' : 'Caminhoneiro';
            setRoleError(`Esta conta está cadastrada como ${tipoReal}. Por favor, selecione o perfil correto para entrar.`);
            setLoading(false);
            return;
          }
        }
        await redirectByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, selectedType]);

  const redirectByRole = async (userId: string) => {
    const roles = await getUserRolesByUserId(userId);

    if (roles.includes('admin')) {
      navigate('/admin/transportadores');
      return;
    }
    if (roles.includes('transportador')) {
      navigate('/transportador/painel');
      return;
    }
    if (roles.includes('produtor')) {
      navigate('/produtor/painel');
      return;
    }
    
    // No role found - redirect to home
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setRoleError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Validate role if type was selected
      if (selectedType && data.user) {
        const roles = await getUserRolesByUserId(data.user.id);
        
        if (!roles.includes(selectedType as AppRole)) {
          await supabase.auth.signOut();
          const tipoReal = roles.includes('produtor') ? 'Proprietário de Animais' : 
                         roles.includes('transportador') ? 'Caminhoneiro' : 
                         roles.includes('admin') ? 'Administrador' : 'desconhecido';
          setRoleError(`Esta conta está cadastrada como ${tipoReal}. Por favor, selecione o perfil correto para entrar.`);
          setLoading(false);
          return;
        }
      }

      toast.success('Login realizado com sucesso!');
      // Redirect will happen via onAuthStateChange
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleChangeType = () => {
    setRoleError(null);
    navigate('/');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  // If no type selected, show type selection
  if (!selectedType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-earth p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center relative">
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute left-4 top-4"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <CardTitle className="text-2xl pt-6">Como você deseja entrar?</CardTitle>
            <CardDescription>
              Selecione seu perfil para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-auto py-5 flex items-center gap-4 justify-start hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => navigate('/auth?tipo=transportador')}
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Sou Caminhoneiro</p>
                <p className="text-sm text-muted-foreground">
                  Transporto animais e quero receber fretes
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-5 flex items-center gap-4 justify-start hover:border-secondary hover:bg-secondary/5 transition-all"
              onClick={() => navigate('/auth?tipo=produtor')}
            >
              <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Tractor className="h-7 w-7 text-secondary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-base">Sou Proprietário de Animais</p>
                <p className="text-sm text-muted-foreground">
                  Tenho animais e preciso de transporte
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipoLabel = selectedType === 'produtor' ? 'Proprietário de Animais' : 'Caminhoneiro';
  const TipoIcon = selectedType === 'produtor' ? Tractor : Truck;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-earth p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          {/* Profile badge */}
          <div className="flex justify-center mb-4 pt-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
              selectedType === 'produtor' 
                ? 'bg-secondary/20 text-secondary-foreground' 
                : 'bg-primary/10 text-primary'
            }`}>
              <TipoIcon className="h-4 w-4" />
              <span className="text-sm font-medium">{tipoLabel}</span>
            </div>
          </div>
          
          <CardTitle className="text-2xl">Entrar no FreteBoi</CardTitle>
          <CardDescription>
            Acesse sua conta de {tipoLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roleError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {roleError}
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2 text-destructive-foreground underline"
                  onClick={handleChangeType}
                >
                  Escolher outro perfil
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
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
                placeholder="Sua senha"
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="button" 
                variant="link" 
                size="sm" 
                className="text-xs px-0"
                onClick={() => navigate('/reset-password')}
              >
                Esqueci minha senha
              </Button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Não tem uma conta?
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (selectedType === 'produtor') {
                  navigate('/produtor/cadastro');
                } else {
                  navigate('/transportador/cadastro');
                }
              }}
            >
              Criar conta como {tipoLabel}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={handleChangeType}
            >
              Entrar com outro perfil
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
