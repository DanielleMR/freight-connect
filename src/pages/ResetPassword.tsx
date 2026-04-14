import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Lock, Mail, CheckCircle } from 'lucide-react';

type ResetState = 'request' | 'reset' | 'success';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ResetState>('request');

  useEffect(() => {
    const handleRecoverySession = async () => {
      // 🔥 tenta pegar via query
      let accessToken = searchParams.get('access_token');
      let refreshToken = searchParams.get('refresh_token');
      let type = searchParams.get('type');

      // 🔥 tenta pegar via hash (#)
      if (!accessToken && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        accessToken = hashParams.get('access_token');
        refreshToken = hashParams.get('refresh_token');
        type = hashParams.get('type');
      }

      // 🔐 valida recovery
      if (accessToken && type === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          toast.error('Link de recuperação inválido ou expirado');
          setState('request');
          return;
        }

        setState('reset');
      }
    };

    handleRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setState('reset');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setState('success');
      toast.success('Senha alterada com sucesso!');
      
      await supabase.auth.signOut();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-earth p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => navigate('/auth')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          {state === 'success' ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Senha Alterada!</CardTitle>
              <CardDescription>
                Sua senha foi alterada com sucesso
              </CardDescription>
            </>
          ) : state === 'reset' ? (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Nova Senha</CardTitle>
              <CardDescription>
                Digite sua nova senha
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
              <CardDescription>
                Digite seu email para receber o link de recuperação
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent>
          {state === 'success' ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Você pode fazer login com sua nova senha.
              </p>
              <Button 
                className="w-full" 
                onClick={() => navigate('/auth')}
              >
                Ir para Login
              </Button>
            </div>
          ) : state === 'reset' ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Verifique também a pasta de spam do seu email
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}