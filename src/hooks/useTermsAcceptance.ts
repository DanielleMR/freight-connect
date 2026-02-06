import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useTermsAcceptance() {
  const { user, loading: authLoading } = useAuth();
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkTerms = async () => {
    if (!user) {
      setNeedsAcceptance(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("aceites_termos")
        .select("tipo_termo")
        .eq("user_id", user.id);

      if (error) throw error;

      const types = (data || []).map((d) => d.tipo_termo);
      const hasTerms = types.includes("termos_uso");
      const hasPrivacy = types.includes("politica_privacidade");

      setNeedsAcceptance(!hasTerms || !hasPrivacy);
    } catch {
      setNeedsAcceptance(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      checkTerms();
    }
  }, [user, authLoading]);

  return {
    needsAcceptance,
    loading: authLoading || loading,
    recheckTerms: checkTerms,
  };
}
