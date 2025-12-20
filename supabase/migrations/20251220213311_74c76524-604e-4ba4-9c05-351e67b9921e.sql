-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'produtor', 'transportador');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create transportadores table
CREATE TABLE public.transportadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL UNIQUE,
    placa_veiculo TEXT,
    capacidade_animais INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transportadores ENABLE ROW LEVEL SECURITY;

-- Transportadores RLS policies
CREATE POLICY "Authenticated users can view transportadores"
ON public.transportadores FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert transportadores"
ON public.transportadores FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update transportadores"
ON public.transportadores FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete transportadores"
ON public.transportadores FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create frete_status enum
CREATE TYPE public.frete_status AS ENUM ('solicitado', 'aceito', 'recusado', 'em_andamento', 'concluido');

-- Create fretes table
CREATE TABLE public.fretes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produtor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transportador_id UUID REFERENCES public.transportadores(id) ON DELETE CASCADE NOT NULL,
    status frete_status DEFAULT 'solicitado' NOT NULL,
    descricao TEXT,
    quantidade_animais INTEGER,
    origem TEXT,
    destino TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fretes ENABLE ROW LEVEL SECURITY;

-- Fretes RLS policies
CREATE POLICY "Produtores can view their own fretes"
ON public.fretes FOR SELECT
TO authenticated
USING (produtor_id = auth.uid());

CREATE POLICY "Transportadores can view fretes assigned to them"
ON public.fretes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.transportadores t
        WHERE t.id = transportador_id AND t.user_id = auth.uid()
    )
);

CREATE POLICY "Produtores can create fretes"
ON public.fretes FOR INSERT
TO authenticated
WITH CHECK (produtor_id = auth.uid() AND public.has_role(auth.uid(), 'produtor'));

CREATE POLICY "Transportadores can update their assigned fretes"
ON public.fretes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.transportadores t
        WHERE t.id = transportador_id AND t.user_id = auth.uid()
    )
);

-- Admins can view all fretes
CREATE POLICY "Admins can view all fretes"
ON public.fretes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transportadores_updated_at
BEFORE UPDATE ON public.transportadores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fretes_updated_at
BEFORE UPDATE ON public.fretes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();