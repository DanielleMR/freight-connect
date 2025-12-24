-- Criar tabela produtores para dados específicos do produtor
CREATE TABLE public.produtores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cpf_cnpj TEXT,
    telefone TEXT NOT NULL,
    cidade TEXT,
    estado TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.produtores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Produtores can view their own data"
ON public.produtores
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Produtores can update their own data"
ON public.produtores
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own produtor profile"
ON public.produtores
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all produtores"
ON public.produtores
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all produtores"
ON public.produtores
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_produtores_updated_at
BEFORE UPDATE ON public.produtores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar colunas para transportadores (tipo_animal, localizacao para mapa)
ALTER TABLE public.transportadores 
ADD COLUMN IF NOT EXISTS tipo_animal TEXT,
ADD COLUMN IF NOT EXISTS tipo_caminhao TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Atualizar política para transportadores editarem seus próprios dados
CREATE POLICY "Transportadores can update their own data"
ON public.transportadores
FOR UPDATE
USING (user_id = auth.uid());