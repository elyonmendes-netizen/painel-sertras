-- Painel de Pendências Sertras: comentário do analista (27/11/2026)
-- Rode UMA vez em: Supabase > SQL Editor > New query > Run
alter table public.itens add column if not exists comentario      text;
alter table public.itens add column if not exists comentario_por  text;
alter table public.itens add column if not exists comentario_data text;
