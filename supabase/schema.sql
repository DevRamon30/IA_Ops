create extension if not exists pgcrypto;

create table if not exists public.demands (
  id bigint generated always as identity primary key,
  external_id text not null unique check (external_id ~ '^[A-Za-z0-9_-]{4,80}$'),
  requester_name text not null check (char_length(requester_name) between 2 and 100),
  requester_email text not null check (requester_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  description text not null check (char_length(description) between 15 and 3000),
  category text check (category in ('contratos','faturamento','acesso','outros')),
  priority text check (priority in ('low','medium','high')),
  confidence numeric(4,3) check (confidence between 0 and 1),
  summary text,
  status text not null default 'received' check (status in ('received','pending_approval','acknowledged','approved','rejected')),
  approval_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  demand_id bigint not null references public.demands(id),
  event_type text not null,
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_errors (
  id bigint generated always as identity primary key,
  scenario text not null,
  external_id text,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demands_status_idx on public.demands(status);
create index if not exists audit_events_demand_idx on public.audit_events(demand_id, created_at desc);

alter table public.demands enable row level security;
alter table public.audit_events enable row level security;
alter table public.automation_errors enable row level security;

-- Todas as chamadas abaixo são feitas pelo Make com service_role, nunca pelo site público.
create or replace function public.register_intake(
  p_external_id text,
  p_name text,
  p_email text,
  p_description text
)
returns table(id bigint, external_id text, status text, created boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_demand public.demands%rowtype;
begin
  insert into demands(external_id, requester_name, requester_email, description)
  values (trim(p_external_id), trim(p_name), lower(trim(p_email)), trim(p_description))
  on conflict on constraint demands_external_id_key
  do nothing returning * into v_demand;

  if found then
    insert into audit_events(demand_id, event_type, actor)
    values (v_demand.id, 'received', 'make');

    return query
      select v_demand.id, v_demand.external_id, v_demand.status, true;
    return;
  end if;

  return query
    select d.id, d.external_id, d.status, false
    from demands d
    where d.external_id = trim(p_external_id);
end $$;

create or replace function public.save_classification(p_id bigint, p_category text, p_priority text, p_confidence numeric, p_summary text, p_needs_review boolean, p_fallback boolean default false)
returns table(id bigint, external_id text, requester_email text, status text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with upd as (
    update demands set category=p_category, priority=p_priority, confidence=p_confidence,
      summary=left(replace(replace(replace(replace(p_summary,E'\r',' '),E'\n',' '),'<',' '),'>',' '),220),
      status=case when p_needs_review then 'pending_approval' else 'acknowledged' end,
      updated_at=now() where demands.id=p_id
    returning demands.*
  ), logged as (
    insert into audit_events(demand_id,event_type,actor,details)
    select upd.id,'classified','make',jsonb_build_object('category',upd.category,'priority',upd.priority,'confidence',upd.confidence,'fallback',p_fallback) from upd
  ) select upd.id,upd.external_id,upd.requester_email,upd.status from upd;
end $$;

create or replace function public.create_review_token(p_id bigint, p_raw_token text)
returns table(id bigint, external_id text, requester_email text, summary text, priority text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with upd as (
    update demands set approval_token_hash=encode(extensions.digest(p_raw_token,'sha256'),'hex'),updated_at=now()
    where demands.id=p_id and demands.status='pending_approval'
    returning demands.*
  ), logged as (
    insert into audit_events(demand_id,event_type,actor) select upd.id,'review_requested','make' from upd
  ) select upd.id,upd.external_id,upd.requester_email,upd.summary,upd.priority from upd;
end $$;

create or replace function public.consume_review_token(p_raw_token text, p_decision text, p_reviewer text)
returns table(id bigint, external_id text, requester_email text, summary text, status text)
language plpgsql security definer set search_path = public as $$
begin
  if p_decision not in ('approve','reject') or char_length(trim(p_reviewer)) not between 2 and 100 then return; end if;
  return query
  with upd as (
    update demands set status=case when p_decision='approve' then 'approved' else 'rejected' end,
      approval_token_hash=null,decided_at=now(),updated_at=now()
    where approval_token_hash=encode(extensions.digest(p_raw_token,'sha256'),'hex')
      and demands.status='pending_approval'
    returning demands.*
  ), logged as (
    insert into audit_events(demand_id,event_type,actor,details)
    select upd.id,upd.status,trim(p_reviewer),jsonb_build_object('decision',p_decision) from upd
  ) select upd.id,upd.external_id,upd.requester_email,upd.summary,upd.status from upd;
end $$;

revoke all on public.demands, public.audit_events, public.automation_errors from anon, authenticated;
grant select, insert, update on public.demands, public.audit_events, public.automation_errors to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on function public.register_intake(text,text,text,text), public.save_classification(bigint,text,text,numeric,text,boolean,boolean), public.create_review_token(bigint,text), public.consume_review_token(text,text,text) from public;
grant execute on function public.register_intake(text,text,text,text), public.save_classification(bigint,text,text,numeric,text,boolean,boolean), public.create_review_token(bigint,text), public.consume_review_token(text,text,text) to service_role;
