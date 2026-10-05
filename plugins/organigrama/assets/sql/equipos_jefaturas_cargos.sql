-- Modelo opcional para Postgres / Supabase (skill organigrama). Adaptar nombres al esquema del proyecto:
--   miembros(empresa_id, usuario_id)  la membresía de una persona en una empresa (p. ej. empresa_miembros)
--   equipos                           o el nombre que ya use el proyecto (p. ej. grupos; conservarlo si otra app lo usa)
-- Lo esencial que el organigrama necesita:
--   · miembros.jefe_usuario_id   jefatura directa, otro miembro de la MISMA empresa, sin ciclos
--   · miembros.cargo             texto libre
--   · equipos.padre_id           equipo padre de la misma empresa, sin ciclos (borrar uno deja a sus hijos en la raíz)
--   · equipos.tipo               'area' (estructura) o 'transversal' (comité, sindicato)
--   · equipo_miembros            integrantes directos; un equipo incluye a los de sus subequipos (vista recursiva)
-- Las escrituras desde el cliente van por RPC security definer con la regla de quién puede (owner/admin), no por update directo.

-- ── Jefatura y cargo en la membresía ──
alter table public.miembros
  add column jefe_usuario_id uuid,
  add column cargo text check (char_length(btrim(cargo)) between 1 and 120),
  add constraint miembros_jefe_fkey foreign key (empresa_id, jefe_usuario_id)
    references public.miembros (empresa_id, usuario_id) on delete set null (jefe_usuario_id),
  add constraint miembros_jefe_no_propio check (jefe_usuario_id is distinct from usuario_id);
create index on public.miembros (empresa_id, jefe_usuario_id);

create function private.jefatura_sin_ciclo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.jefe_usuario_id is not null and exists (
      with recursive arriba(id) as (
        select new.jefe_usuario_id
        union select m.jefe_usuario_id from public.miembros m join arriba a on m.usuario_id = a.id
        where m.empresa_id = new.empresa_id and m.jefe_usuario_id is not null)
      select 1 from arriba where id = new.usuario_id) then
    raise exception 'Esa jefatura formaría un círculo.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger jefatura_sin_ciclo before insert or update of jefe_usuario_id on public.miembros
for each row execute function private.jefatura_sin_ciclo();

-- ── Equipos anidados ──
create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  tipo text not null default 'area' check (tipo in ('area', 'transversal')),
  padre_id uuid,
  creado_en timestamptz not null default now(),
  unique (empresa_id, nombre),
  unique (empresa_id, id),
  foreign key (empresa_id, padre_id) references public.equipos (empresa_id, id) on delete set null (padre_id)
);
create index on public.equipos (padre_id);

create function private.equipo_sin_ciclo() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.padre_id is not null and (new.padre_id = new.id or exists (
      with recursive arriba(id) as (
        select new.padre_id
        union select e.padre_id from public.equipos e join arriba a on e.id = a.id where e.padre_id is not null)
      select 1 from arriba where id = new.id)) then
    raise exception 'Un equipo no puede quedar dentro de sí mismo ni de uno de sus subequipos.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger equipo_sin_ciclo before insert or update of padre_id on public.equipos
for each row execute function private.equipo_sin_ciclo();

-- Integrantes directos: la FK compuesta exige que la persona sea miembro de la empresa del equipo
create table public.equipo_miembros (
  equipo_id uuid not null,
  empresa_id uuid not null,
  usuario_id uuid not null,
  primary key (equipo_id, usuario_id),
  foreign key (empresa_id, equipo_id) references public.equipos (empresa_id, id) on delete cascade,
  foreign key (empresa_id, usuario_id) references public.miembros (empresa_id, usuario_id) on delete cascade
);

-- Integrantes heredados: quien está en un subequipo también cuenta en sus equipos superiores
-- (úsalo en reglas de acceso: dar acceso a "Gerencia TI" alcanza a Desarrollo y Soporte)
create view public.equipo_integrantes with (security_invoker = true) as
with recursive arriba(equipo_id, usuario_id) as (
  select equipo_id, usuario_id from public.equipo_miembros
  union
  select e.padre_id, a.usuario_id from public.equipos e join arriba a on e.id = a.equipo_id where e.padre_id is not null)
select equipo_id, usuario_id from arriba;

-- RLS: lectura para miembros de la empresa y escritura para quien la gestiona (owner/admin), según el proyecto.
alter table public.equipos enable row level security;
alter table public.equipo_miembros enable row level security;
