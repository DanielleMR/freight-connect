import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserCapabilities } from "@/hooks/useUserCapabilities";
import { supabase } from "@/integrations/supabase/client";
import ProfileSetup from "@/components/auth/ProfileSetup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Tractor, Loader2 } from "lucide-react";

type ProfileType = "producer" | "driver";

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { capabilities, loading: capLoading } = useUserCapabilities();
  const [selectedType, setSelectedType] = useState<ProfileType | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || capLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // If user already has a complete profile, redirect to dashboard
    checkExistingProfile();
  }, [user, authLoading, capLoading]);

  const checkExistingProfile = async () => {
    if (!user) return;

    try {
      // Check if user has any profile (new or legacy)
      const [producerRes, driverRes, legacyProdRes, legacyTransRes] = await Promise.all([
        supabase.from("producer_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("driver_profiles").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("produtores").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("transportadores").select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      const hasProfile =
        producerRes.data || driverRes.data || legacyProdRes.data || legacyTransRes.data;

      if (hasProfile) {
        navigate("/painel", { replace: true });
        return;
      }

      // Auto-select type if user already has a capability
      if (capabilities.includes("producer")) {
        setSelectedType("producer");
      } else if (capabilities.includes("driver")) {
        setSelectedType("driver");
      }
    } catch (err) {
      console.error("Error checking profile:", err);
    } finally {
      setChecking(false);
    }
  };

  if (authLoading || capLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // If no type selected, show selection
  if (!selectedType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-earth p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Complete seu perfil</CardTitle>
            <CardDescription>
              Para continuar, escolha seu tipo de perfil e preencha seus dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-auto py-5 flex items-center gap-4 justify-start hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => setSelectedType("driver")}
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
              onClick={() => setSelectedType("producer")}
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

  return <ProfileSetup profileType={selectedType} />;
}
