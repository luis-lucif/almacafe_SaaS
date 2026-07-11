-- 1. Crear la tabla de pedidos (orders)
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references businesses(id) on delete cascade not null,
  table_number text not null check (char_length(table_number) <= 10),
  status text default 'pending' check (status in ('pending', 'preparing', 'delivered', 'completed')) not null,
  items jsonb not null, -- Array de productos: [{ id, name, price, quantity }]
  total numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar RLS (Seguridad a Nivel de Fila)
alter table orders enable row level security;

-- 3. Políticas de Acceso RLS
-- Permitir a cualquier persona (clientes del menú) insertar nuevos pedidos
create policy "Anyone can insert orders" 
on orders for insert 
with check (true);

-- Permitir al dueño del negocio gestionar (Select, Update, Delete) sus pedidos
create policy "Owners can manage their own orders" 
on orders for all 
using (
  exists (
    select 1 from businesses
    where businesses.id = orders.business_id
    and businesses.owner_id = auth.uid()
  )
);

-- 4. Habilitar la tabla en la publicación de tiempo real (Realtime)
-- Esto permite que el dashboard escuche actualizaciones en vivo
alter publication supabase_realtime add table orders;
