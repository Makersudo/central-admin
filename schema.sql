-- ==========================================
-- SCRIPT DE BANCO DE DADOS - CENTRAL ADMIN
-- Rode este script no "SQL Editor" do seu novo banco no Supabase
-- ==========================================

-- 1. Criação da Tabela de Licenças
create table if not exists public.catalog_licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text not null unique,
  client_name text not null,
  domain text,
  active boolean not null default true,
  message text default 'Plataforma suspensa por pendências financeiras. Entre em contato com o suporte para reativação.',
  support_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.1 Índices de Alta Performance para Validação Rápida
create index if not exists idx_catalog_licenses_key on public.catalog_licenses(license_key);
create index if not exists idx_catalog_licenses_active on public.catalog_licenses(active);

-- 2. Habilita RLS (Row Level Security)
alter table public.catalog_licenses enable row level security;

-- 3. Política: Permitir leitura pública (para os catálogos dos clientes validarem as chaves)
drop policy if exists "Permitir leitura publica de licenças" on public.catalog_licenses;
create policy "Permitir leitura publica de licenças"
  on public.catalog_licenses for select
  using (true);

-- 4. Política: Permitir todas as operações para usuários autenticados (Você / Administrador)
drop policy if exists "Permitir tudo para administradores autenticados" on public.catalog_licenses;
create policy "Permitir tudo para administradores autenticados"
  on public.catalog_licenses for all
  to authenticated
  using (true)
  with check (true);

-- 5. Criação de Gatilho para atualizar a coluna updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_catalog_licenses_updated_at on public.catalog_licenses;
create trigger trg_catalog_licenses_updated_at
  before update on public.catalog_licenses
  for each row execute function public.set_updated_at();

-- 6. Liberação de permissões de acesso
grant select on public.catalog_licenses to anon, authenticated;
grant all on public.catalog_licenses to service_role;
