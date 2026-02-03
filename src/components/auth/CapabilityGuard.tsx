import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserCapabilities, UserCapability } from '@/hooks/useUserCapabilities';
import { useUserRole } from '@/hooks/useUserRole';

interface CapabilityGuardProps {
  children: ReactNode;
  requiredCapabilities?: UserCapability[];
  requireAny?: boolean; // true = any capability matches, false = all required
  redirectTo?: string;
  allowAdmin?: boolean;
}

const CapabilityGuard = ({ 
  children, 
  requiredCapabilities = [],
  requireAny = true,
  redirectTo = '/auth',
  allowAdmin = true
}: CapabilityGuardProps) => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { capabilities, loading: capLoading } = useUserCapabilities();
  const { isAdmin } = useUserRole();

  const loading = authLoading || capLoading;

  useEffect(() => {
    if (loading) return;

    // Not authenticated
    if (!user) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Admin bypass
    if (allowAdmin && isAdmin) {
      return;
    }

    // Check capabilities
    if (requiredCapabilities.length > 0) {
      const hasAccess = requireAny
        ? requiredCapabilities.some(cap => capabilities.includes(cap))
        : requiredCapabilities.every(cap => capabilities.includes(cap));

      if (!hasAccess) {
        // Redirect based on user's actual capabilities
        if (capabilities.includes('driver')) {
          navigate('/motorista/painel', { replace: true });
        } else if (capabilities.includes('producer')) {
          navigate('/produtor/painel', { replace: true });
        } else if (capabilities.includes('company_admin')) {
          navigate('/empresa/painel', { replace: true });
        } else {
          navigate('/completar-perfil', { replace: true });
        }
      }
    }
  }, [user, capabilities, loading, requiredCapabilities, requireAny, navigate, redirectTo, allowAdmin, isAdmin]);

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
  if (!user) {
    return null;
  }

  // Admin bypass
  if (allowAdmin && isAdmin) {
    return <>{children}</>;
  }

  // Check capabilities
  if (requiredCapabilities.length > 0) {
    const hasAccess = requireAny
      ? requiredCapabilities.some(cap => capabilities.includes(cap))
      : requiredCapabilities.every(cap => capabilities.includes(cap));

    if (!hasAccess) {
      return null;
    }
  }

  return <>{children}</>;
};

export default CapabilityGuard;
