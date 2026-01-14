import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Tractor, Truck, ShieldCheck, ArrowLeft } from 'lucide-react';

type UserRole = 'admin' | 'produtor' | 'transportador';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
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
        await redirectByRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const redirectByRole = async (userId: string) => {
    // Check user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (roles && roles.length > 0) {
      const roleList = roles.map(r => r.role as UserRole);
      
      if (roleList.includes('admin')) {
        navigate('/admin/transportadores');
        return;
      }
      if (roleList.includes('transportador')) {
        navigate('/transportador/painel');
        return;
      }
      if (roleList.includes('produtor')) {
        navigate('/produtor/painel');
        return;
      }
    }
    
    // No role found - redirect to home
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success('Login realizado com sucesso!');
      // Redirect will happen via onAuthStateChange
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Verificando sessão...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-earth p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <CardTitle className="text-2xl">Entrar no FreteBoi</CardTitle>
          <CardDescription>
            Acesse sua conta ou crie uma nova
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Criar Conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Escolha seu perfil para criar uma conta:
                </p>
                
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                  onClick={() => navigate('/produtor/cadastro')}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Tractor className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Sou Produtor</p>
                    <p className="text-xs text-muted-foreground">
                      Quero solicitar fretes para meus animais
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex items-center gap-4 justify-start"
                  onClick={() => navigate('/transportador/cadastro')}
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Sou Transportador</p>
                    <p className="text-xs text-muted-foreground">
                      Quero receber solicitações de frete
                    </p>
                  </div>
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Administrador
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="w-full h-auto py-3 flex items-center gap-3 justify-start text-muted-foreground"
                  onClick={() => navigate('/admin/login')}
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span className="text-sm">Acesso administrativo</span>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}