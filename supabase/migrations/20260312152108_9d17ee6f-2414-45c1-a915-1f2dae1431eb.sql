
-- =====================================================
-- PRODUCTION INDEXES - Performance Optimization
-- =====================================================

-- fretes table (heavily queried)
CREATE INDEX IF NOT EXISTS idx_fretes_produtor_id ON public.fretes(produtor_id);
CREATE INDEX IF NOT EXISTS idx_fretes_transportador_id ON public.fretes(transportador_id);
CREATE INDEX IF NOT EXISTS idx_fretes_status ON public.fretes(status);
CREATE INDEX IF NOT EXISTS idx_fretes_public_id ON public.fretes(public_id);

-- documentos table
CREATE INDEX IF NOT EXISTS idx_documentos_user_id_status ON public.documentos(user_id, status);

-- mensagens_chat table
CREATE INDEX IF NOT EXISTS idx_mensagens_chat_frete_id ON public.mensagens_chat(frete_id);

-- notificacoes table
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id_lida ON public.notificacoes(user_id, lida);

-- user_roles table
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- user_capabilities table
CREATE INDEX IF NOT EXISTS idx_user_capabilities_user_id_active ON public.user_capabilities(user_id, active);

-- transportadores table
CREATE INDEX IF NOT EXISTS idx_transportadores_user_id ON public.transportadores(user_id);
CREATE INDEX IF NOT EXISTS idx_transportadores_ativo ON public.transportadores(ativo);

-- produtores table
CREATE INDEX IF NOT EXISTS idx_produtores_user_id ON public.produtores(user_id);

-- reports table
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- rate_limits table
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- avaliacoes table
CREATE INDEX IF NOT EXISTS idx_avaliacoes_transportador_id ON public.avaliacoes(transportador_id);

-- contratos table
CREATE INDEX IF NOT EXISTS idx_contratos_frete_id ON public.contratos(frete_id);

-- pagamentos table
CREATE INDEX IF NOT EXISTS idx_pagamentos_transportador_id ON public.pagamentos(transportador_id);

-- freight_assignments table
CREATE INDEX IF NOT EXISTS idx_freight_assignments_driver_id ON public.freight_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_freight_assignments_freight_id ON public.freight_assignments(freight_id);

-- driver_profiles table
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON public.driver_profiles(user_id);

-- producer_profiles table
CREATE INDEX IF NOT EXISTS idx_producer_profiles_user_id ON public.producer_profiles(user_id);

-- =====================================================
-- TABLE DUPLICATION STRATEGY
-- Mark legacy tables with comments and create compatibility views
-- Official tables: produtores, transportadores, fretes (legacy - most data/FKs)
-- Deprecated: producer_profiles, driver_profiles, freights (new v2 - limited usage)
-- =====================================================

COMMENT ON TABLE public.produtores IS 'OFFICIAL - Primary producer table. Used by fretes, contratos, chat, pagamentos.';
COMMENT ON TABLE public.transportadores IS 'OFFICIAL - Primary transporter table. Used by fretes, contratos, pagamentos, avaliacoes.';
COMMENT ON TABLE public.fretes IS 'OFFICIAL - Primary freight table. Core marketplace entity.';

COMMENT ON TABLE public.producer_profiles IS 'DEPRECATED - New capability-based producer table. Migrate to produtores. Will be unified in future release.';
COMMENT ON TABLE public.driver_profiles IS 'DEPRECATED - New capability-based driver table. Functionality to be merged with transportadores. Will be unified in future release.';
COMMENT ON TABLE public.freights IS 'DEPRECATED - New v2 freight table. Migrate to fretes. Will be unified in future release.';

-- Cron cleanup for rate_limits (run via pg_cron if available)
-- Note: This adds a comment for operational awareness
COMMENT ON TABLE public.rate_limits IS 'Rate limiting records. Requires periodic cleanup via cleanup_rate_limits() function.';
