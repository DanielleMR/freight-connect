-- Inserir transportadores de teste COM coordenadas (user_id nullable)
INSERT INTO public.transportadores (
  nome, telefone, whatsapp, regiao_atendimento, tipo_animal, 
  capacidade_animais, tipo_caminhao, placa_veiculo, ativo, 
  latitude, longitude
) VALUES 
(
  'José Carlos Transportes',
  '(34) 99999-1234',
  '(34) 99999-1234',
  'Triângulo Mineiro',
  'bovino',
  25,
  'carreta',
  'ABC-1234',
  true,
  -18.9186,
  -48.2772
),
(
  'Maria Silva Fretes',
  '(31) 98888-5678',
  '(31) 98888-5678',
  'Sul de Minas',
  'equino',
  15,
  'truck',
  'XYZ-9876',
  true,
  -21.7642,
  -43.3496
)
ON CONFLICT DO NOTHING;