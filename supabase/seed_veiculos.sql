-- Pré-cadastro dos veículos da Banho de Brilho (para escolher na OS).
-- Idempotente: só insere se a placa ainda não existir.
insert into vehicles (model, color, plate, active)
select v.model, v.color, v.plate, true
from (values
  ('Caminhão',              'Branco',   'HKZ 1368'),
  ('Fiat Doblô Adventure',  'Vermelho', 'PWO9E43'),
  ('Fiat Strada',           'Preto',    'HEL 9222'),
  ('Volkswagen Kombi',      'Branca',   'HJG 5485')
) as v(model, color, plate)
where not exists (
  select 1 from vehicles ve where upper(ve.plate) = upper(v.plate)
);
