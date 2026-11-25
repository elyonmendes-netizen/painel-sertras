-- Painel de Pendências Sertras — estrutura do banco
-- Rode este arquivo inteiro UMA vez em: Supabase > SQL Editor > New query > Run

-- 1) Cada coleta diária vira uma "leitura"
create table if not exists public.leituras (
  id          bigserial primary key,
  criado_em   timestamptz not null default now(),
  total       int not null default 0,
  por_status  jsonb not null default '{}'::jsonb,   -- {"Pendente": 85, ...}
  por_grupo   jsonb not null default '{}'::jsonb,   -- {"128/2024-RIO": {"Pendente": 40, ...}}
  aprovados   int not null default 0,
  contratos_lidos int not null default 0,
  erros       jsonb not null default '[]'::jsonb
);

-- 2) Itens em aberto encontrados em cada leitura
create table if not exists public.itens (
  id           bigserial primary key,
  leitura_id   bigint not null references public.leituras(id) on delete cascade,
  chave        text not null,
  contrato_id  text not null,
  contrato     text not null,      -- ex.: "SUB 05 - 128/2024-RIO"
  grupo        text not null,      -- ex.: "128/2024-RIO"
  empresa      text,
  relatorio    text not null,      -- Mensal Pessoas / Mensal Empresa / Integração Pessoas / Integração Empresa
  pessoa       text,
  funcao       text,
  evento       text,
  documento    text,
  competencia  text,
  data_envio   text,
  status       text not null,
  sla          text,
  primeira_vez timestamptz not null default now()  -- desde quando está em aberto
);
create index if not exists itens_leitura_idx on public.itens(leitura_id);
create index if not exists itens_contrato_idx on public.itens(leitura_id, contrato_id);

-- 3) Itens que estavam em aberto e saíram da lista (= aprovados)
create table if not exists public.aprovados (
  id           bigserial primary key,
  leitura_id   bigint not null references public.leituras(id) on delete cascade,
  detectado_em timestamptz not null default now(),
  chave        text not null,
  contrato_id  text not null,
  contrato     text not null,
  grupo        text not null,
  empresa      text,
  relatorio    text,
  pessoa       text,
  funcao       text,
  evento       text,
  documento    text,
  competencia  text,
  ultimo_status text,
  primeira_vez timestamptz
);
create index if not exists aprovados_leitura_idx on public.aprovados(leitura_id);

-- 4) Segurança: só quem está logado consegue LER. Ninguém grava pelo navegador.
--    A gravação é feita só pelo servidor (rota /api/ingest com a chave service_role).
alter table public.leituras  enable row level security;
alter table public.itens     enable row level security;
alter table public.aprovados enable row level security;

drop policy if exists "leitura logado" on public.leituras;
drop policy if exists "leitura logado" on public.itens;
drop policy if exists "leitura logado" on public.aprovados;

create policy "leitura logado" on public.leituras  for select to authenticated using (true);
create policy "leitura logado" on public.itens     for select to authenticated using (true);
create policy "leitura logado" on public.aprovados for select to authenticated using (true);

-- 5) Permissões da API (projetos novos do Supabase não liberam sozinhos)
grant usage on schema public to authenticated, service_role;
grant select on public.leituras, public.itens, public.aprovados to authenticated;
grant all on public.leituras, public.itens, public.aprovados to service_role;
grant usage, select on all sequences in schema public to service_role;
