-- Remover a FK incorreta de produtor_id para auth.users
-- O produtor_id deve referenciar a tabela produtores, não auth.users
ALTER TABLE public.fretes DROP CONSTRAINT IF EXISTS fretes_produtor_id_fkey;

-- Adicionar a FK correta para a tabela produtores
ALTER TABLE public.fretes 
ADD CONSTRAINT fretes_produtor_id_fkey 
FOREIGN KEY (produtor_id) REFERENCES public.produtores(id);