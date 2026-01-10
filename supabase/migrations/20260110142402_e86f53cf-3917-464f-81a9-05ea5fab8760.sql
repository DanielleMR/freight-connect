-- Adicionar valor default para public_id para que seja gerado automaticamente pela coluna
-- Isso resolve o problema de ter que passar public_id no insert

-- Primeiro, criar uma função wrapper que gera o ID
CREATE OR REPLACE FUNCTION public.generate_default_transportador_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN generate_public_id('TR');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_default_produtor_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN generate_public_id('PR');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_default_frete_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN generate_public_id('FT');
END;
$$;

-- Definir defaults para as colunas public_id
ALTER TABLE public.transportadores 
ALTER COLUMN public_id SET DEFAULT generate_default_transportador_id();

ALTER TABLE public.produtores 
ALTER COLUMN public_id SET DEFAULT generate_default_produtor_id();

ALTER TABLE public.fretes 
ALTER COLUMN public_id SET DEFAULT generate_default_frete_id();