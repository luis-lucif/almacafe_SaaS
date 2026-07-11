-- 1. Crear tabla de mesas del negocio
create table if not exists business_tables (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null, -- Ej: "Mesa 1", "Mesa 2", "Barra"
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(business_id, name)
);

-- 2. Habilitar RLS (Seguridad) en la tabla de mesas
alter table business_tables enable row level security;

-- 3. Borrar políticas si existen por re-ejecución
drop policy if exists "Tables are viewable by everyone" on business_tables;
drop policy if exists "Owners can manage their own tables" on business_tables;

-- 4. Políticas de RLS para business_tables
-- LECTURA: Cualquiera puede ver las mesas de los negocios (público)
create policy "Tables are viewable by everyone" 
on business_tables for select 
using (is_active = true);

-- GESTIÓN: Solo el dueño del negocio puede crear/editar/borrar sus mesas
create policy "Owners can manage their own tables" 
on business_tables for all 
using (
  exists (
    select 1 from businesses
    where businesses.id = business_tables.business_id
    and businesses.owner_id = auth.uid()
  )
);

-- 5. Modificar la tabla 'orders' para vincularla a la mesa
alter table orders add column if not exists table_id uuid references business_tables(id) on delete set null;

-- 6. Insertar mesa por defecto para desarrollo local (Mesa 1)
-- Vinculado al ID de negocio obtenido de tus credenciales locales.
insert into business_tables (id, business_id, name, is_active)
values (
  'd0000000-0000-0000-0000-000000000001', 
  '2e9535f5-f50d-4356-ab42-e0d878ad560e', 
  'Mesa 1', 
  true
)
on conflict (business_id, name) do nothing;
