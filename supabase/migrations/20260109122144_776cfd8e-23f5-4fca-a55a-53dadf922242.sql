-- Função para gerar ID público único
CREATE OR REPLACE FUNCTION public.generate_public_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := prefix || '-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Adicionar coluna public_id aos transportadores
ALTER TABLE public.transportadores
ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Adicionar coluna public_id aos produtores
ALTER TABLE public.produtores
ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Adicionar coluna public_id aos fretes
ALTER TABLE public.fretes
ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;

-- Função para gerar public_id automaticamente para transportadores
CREATE OR REPLACE FUNCTION public.generate_transportador_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_id := generate_public_id('TR');
    BEGIN
      NEW.public_id := new_id;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar ID público único após 10 tentativas';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Função para gerar public_id automaticamente para produtores
CREATE OR REPLACE FUNCTION public.generate_produtor_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_id := generate_public_id('PR');
    BEGIN
      NEW.public_id := new_id;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar ID público único após 10 tentativas';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Função para gerar public_id automaticamente para fretes
CREATE OR REPLACE FUNCTION public.generate_frete_public_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_id := generate_public_id('FT');
    BEGIN
      NEW.public_id := new_id;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar ID público único após 10 tentativas';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Triggers para gerar public_id automaticamente
DROP TRIGGER IF EXISTS trigger_generate_transportador_public_id ON public.transportadores;
CREATE TRIGGER trigger_generate_transportador_public_id
  BEFORE INSERT ON public.transportadores
  FOR EACH ROW
  WHEN (NEW.public_id IS NULL)
  EXECUTE FUNCTION public.generate_transportador_public_id();

DROP TRIGGER IF EXISTS trigger_generate_produtor_public_id ON public.produtores;
CREATE TRIGGER trigger_generate_produtor_public_id
  BEFORE INSERT ON public.produtores
  FOR EACH ROW
  WHEN (NEW.public_id IS NULL)
  EXECUTE FUNCTION public.generate_produtor_public_id();

DROP TRIGGER IF EXISTS trigger_generate_frete_public_id ON public.fretes;
CREATE TRIGGER trigger_generate_frete_public_id
  BEFORE INSERT ON public.fretes
  FOR EACH ROW
  WHEN (NEW.public_id IS NULL)
  EXECUTE FUNCTION public.generate_frete_public_id();

-- Gerar IDs públicos para registros existentes
UPDATE public.transportadores 
SET public_id = generate_public_id('TR') 
WHERE public_id IS NULL;

UPDATE public.produtores 
SET public_id = generate_public_id('PR') 
WHERE public_id IS NULL;

UPDATE public.fretes 
SET public_id = generate_public_id('FT') 
WHERE public_id IS NULL;

-- Tornar colunas NOT NULL após popular dados existentes
ALTER TABLE public.transportadores
ALTER COLUMN public_id SET NOT NULL;

ALTER TABLE public.produtores
ALTER COLUMN public_id SET NOT NULL;

ALTER TABLE public.fretes
ALTER COLUMN public_id SET NOT NULL;