import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  type: 'frete_criado' | 'frete_aceito' | 'frete_status' | 'disputa_aberta' | 'suspensao';
  freteId?: string;
  userId?: string;
  details?: Record<string, string>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type, freteId, userId, details }: NotifyRequest = await req.json();

    // Build notification based on type
    let titulo = '';
    let mensagem = '';
    let targetUserIds: string[] = [];

    switch (type) {
      case 'frete_criado': {
        titulo = 'Novo frete solicitado';
        mensagem = `Novo frete de ${details?.origem || '?'} para ${details?.destino || '?'}`;
        if (userId) targetUserIds.push(userId);
        break;
      }
      case 'frete_aceito': {
        titulo = 'Frete aceito';
        mensagem = `O frete ${details?.publicId || ''} foi aceito pelo transportador`;
        if (userId) targetUserIds.push(userId);
        break;
      }
      case 'frete_status': {
        titulo = 'Status do frete atualizado';
        mensagem = `Frete ${details?.publicId || ''}: ${details?.novoStatus || ''}`;
        if (userId) targetUserIds.push(userId);
        break;
      }
      case 'disputa_aberta': {
        titulo = '⚠️ Disputa aberta';
        mensagem = `Uma disputa foi aberta para o frete ${details?.publicId || ''}: ${details?.motivo || ''}`;
        if (userId) targetUserIds.push(userId);
        break;
      }
      case 'suspensao': {
        titulo = '🚫 Conta suspensa';
        mensagem = `Sua conta foi suspensa. Motivo: ${details?.motivo || 'Não informado'}`;
        if (userId) targetUserIds.push(userId);
        break;
      }
    }

    // Create in-app notifications
    const notifications = targetUserIds.map(uid => ({
      user_id: uid,
      tipo: type,
      titulo,
      mensagem,
      referencia_id: freteId || null,
      referencia_tipo: freteId ? 'frete' : null,
    }));

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notificacoes')
        .insert(notifications);

      if (error) {
        console.error('Error creating notifications:', error);
      }
    }

    // Log for audit
    console.log(`[NOTIFY] type=${type}, targets=${targetUserIds.length}, titulo=${titulo}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsCreated: notifications.length,
        // In production, this would also trigger email via Resend
        emailSimulated: true,
        emailPreview: { titulo, mensagem, to: targetUserIds }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
