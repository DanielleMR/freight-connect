import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole, AppRole } from '@/hooks/useUserRole';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  redirectTo?: string;
}

const RouteGuard = ({ children, allowedRoles, redirectTo = '/auth' }: RouteGuardProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { roles, loading: roleLoading } = useUserRole();

  const loading = authLoading || roleLoading;

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check if user has any of the allowed roles
    const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
    
    if (!hasAllowedRole) {
      // Redirect based on user's actual role
      if (roles.includes('admin')) {
        navigate('/admin/transportadores', { replace: true });
      } else if (roles.includes('transportador')) {
        navigate('/transportador/painel', { replace: true });
      } else if (roles.includes('produtor')) {
        navigate('/produtor/painel', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, roles, loading, allowedRoles, navigate, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Check authorization
  const hasAllowedRole = allowedRoles.some(role => roles.includes(role));
  
  if (!user || !hasAllowedRole) {
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard;
