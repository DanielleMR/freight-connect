-- =====================================================
-- REESTRUTURAÇÃO COMPLETA: MODELO MULTI-CAPACIDADE
-- =====================================================

-- 1. Criar novos tipos enum
CREATE TYPE public.user_capability AS ENUM ('producer', 'driver', 'company_admin');
CREATE TYPE public.cnh_status AS ENUM ('pending', 'validated', 'rejected');
CREATE TYPE public.vehicle_type AS ENUM ('truck', 'carreta', 'bitruck', 'romeu_julieta');
CREATE TYPE public.freight_status_v2 AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');

-- 2. Criar tabela de capacidades do usuário (substitui user_roles para lógica de negócio)
CREATE TABLE public.user_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capability user_capability NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, capability)
);

-- 3. Perfil de Produtor
CREATE TABLE public.producer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    public_id TEXT NOT NULL DEFAULT generate_public_id('PR') UNIQUE,
    name TEXT NOT NULL,
    cpf_cnpj TEXT,
    phone TEXT NOT NULL,
    city TEXT,
    state TEXT,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Perfil de Motorista (driver)
CREATE TABLE public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    public_id TEXT NOT NULL DEFAULT generate_public_id('DR') UNIQUE,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    cnh_number TEXT,
    cnh_category TEXT,
    cnh_expiry DATE,
    cnh_status cnh_status NOT NULL DEFAULT 'pending',
    cnh_validated_at TIMESTAMPTZ,
    cnh_validated_by UUID,
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Empresa de Transporte
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT NOT NULL DEFAULT generate_public_id('CO') UNIQUE,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Motoristas vinculados a empresas
CREATE TABLE public.company_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    driver_profile_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (company_id, driver_profile_id)
);

-- 7. Veículos
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT NOT NULL DEFAULT generate_public_id('VH') UNIQUE,
    plate TEXT NOT NULL UNIQUE,
    vehicle_type vehicle_type NOT NULL,
    capacity INTEGER NOT NULL,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    owner_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Veículo pertence a um usuário OU empresa, não ambos
    CONSTRAINT vehicle_single_owner CHECK (
        (owner_user_id IS NOT NULL AND owner_company_id IS NULL) OR
        (owner_user_id IS NULL AND owner_company_id IS NOT NULL)
    )
);

-- 8. Nova tabela de Fretes (v2)
CREATE TABLE public.freights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id TEXT NOT NULL DEFAULT generate_public_id('FT') UNIQUE,
    producer_id UUID NOT NULL REFERENCES public.producer_profiles(id),
    animal_type TEXT NOT NULL,
    animal_quantity INTEGER NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    scheduled_date DATE,
    special_requirements TEXT,
    estimated_value NUMERIC,
    status freight_status_v2 NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Atribuição de Frete (após aceite)
CREATE TABLE public.freight_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freight_id UUID NOT NULL REFERENCES public.freights(id) ON DELETE CASCADE UNIQUE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    driver_id UUID NOT NULL REFERENCES public.driver_profiles(id),
    company_id UUID REFERENCES public.companies(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    driver_phone TEXT NOT NULL,
    company_phone TEXT
);

-- 10. Habilitar RLS em todas as tabelas
ALTER TABLE public.user_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freight_assignments ENABLE ROW LEVEL SECURITY;

-- 11. Função para verificar capacidade
CREATE OR REPLACE FUNCTION public.has_capability(_user_id UUID, _capability user_capability)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_capabilities
    WHERE user_id = _user_id
      AND capability = _capability
      AND active = true
  )
$$;

-- 12. Função para verificar se motorista pode aceitar fretes
CREATE OR REPLACE FUNCTION public.driver_can_accept_freight(_driver_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.driver_profiles
    WHERE id = _driver_id
      AND cnh_status = 'validated'
      AND active = true
  )
$$;

-- 13. Função para verificar se veículo está disponível
CREATE OR REPLACE FUNCTION public.vehicle_is_available(_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.freight_assignments fa
    JOIN public.freights f ON f.id = fa.freight_id
    WHERE fa.vehicle_id = _vehicle_id
      AND f.status IN ('accepted', 'in_progress')
  )
$$;

-- =====================================================
-- RLS POLICIES: USER_CAPABILITIES
-- =====================================================
CREATE POLICY "Users can view their own capabilities"
ON public.user_capabilities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own capabilities"
ON public.user_capabilities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all capabilities"
ON public.user_capabilities FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES: PRODUCER_PROFILES
-- =====================================================
CREATE POLICY "Users can view their own producer profile"
ON public.producer_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own producer profile"
ON public.producer_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own producer profile"
ON public.producer_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all producer profiles"
ON public.producer_profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Drivers can view producer info for assigned freights"
ON public.producer_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.freights f
    JOIN public.freight_assignments fa ON fa.freight_id = f.id
    JOIN public.driver_profiles dp ON dp.id = fa.driver_id
    WHERE f.producer_id = producer_profiles.id
      AND dp.user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: DRIVER_PROFILES
-- =====================================================
CREATE POLICY "Users can view their own driver profile"
ON public.driver_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own driver profile"
ON public.driver_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own driver profile"
ON public.driver_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all driver profiles"
ON public.driver_profiles FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers can view drivers for their freights"
ON public.driver_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.freights f
    JOIN public.freight_assignments fa ON fa.freight_id = f.id
    JOIN public.producer_profiles pp ON pp.id = f.producer_id
    WHERE fa.driver_id = driver_profiles.id
      AND pp.user_id = auth.uid()
  )
);

-- =====================================================
-- RLS POLICIES: COMPANIES
-- =====================================================
CREATE POLICY "Company admins can view their company"
ON public.companies FOR SELECT
USING (auth.uid() = admin_user_id);

CREATE POLICY "Company admins can update their company"
ON public.companies FOR UPDATE
USING (auth.uid() = admin_user_id);

CREATE POLICY "Users can create companies"
ON public.companies FOR INSERT
WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can manage all companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES: COMPANY_DRIVERS
-- =====================================================
CREATE POLICY "Company admins can manage their drivers"
ON public.company_drivers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_drivers.company_id
      AND c.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view their company links"
ON public.company_drivers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.id = company_drivers.driver_profile_id
      AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all company drivers"
ON public.company_drivers FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES: VEHICLES
-- =====================================================
CREATE POLICY "Users can view their own vehicles"
ON public.vehicles FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can create their own vehicles"
ON public.vehicles FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own vehicles"
ON public.vehicles FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Company admins can manage company vehicles"
ON public.vehicles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = vehicles.owner_company_id
      AND c.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all vehicles"
ON public.vehicles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES: FREIGHTS
-- =====================================================
CREATE POLICY "Producers can view their own freights"
ON public.freights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.producer_profiles pp
    WHERE pp.id = freights.producer_id
      AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "Producers can create freights"
ON public.freights FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.producer_profiles pp
    WHERE pp.id = freights.producer_id
      AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "Assigned drivers can view their freights"
ON public.freights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.freight_assignments fa
    JOIN public.driver_profiles dp ON dp.id = fa.driver_id
    WHERE fa.freight_id = freights.id
      AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers with validated CNH can view pending freights"
ON public.freights FOR SELECT
USING (
  freights.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.user_id = auth.uid()
      AND dp.cnh_status = 'validated'
      AND dp.active = true
  )
);

CREATE POLICY "Admins can manage all freights"
ON public.freights FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES: FREIGHT_ASSIGNMENTS
-- =====================================================
CREATE POLICY "Drivers can create assignments"
ON public.freight_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.id = freight_assignments.driver_id
      AND dp.user_id = auth.uid()
      AND dp.cnh_status = 'validated'
  )
);

CREATE POLICY "Involved parties can view assignments"
ON public.freight_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.id = freight_assignments.driver_id
      AND dp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.freights f
    JOIN public.producer_profiles pp ON pp.id = f.producer_id
    WHERE f.id = freight_assignments.freight_id
      AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can update their assignments"
ON public.freight_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.id = freight_assignments.driver_id
      AND dp.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all assignments"
ON public.freight_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_producer_profiles_updated_at
BEFORE UPDATE ON public.producer_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_profiles_updated_at
BEFORE UPDATE ON public.driver_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_freights_updated_at
BEFORE UPDATE ON public.freights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();