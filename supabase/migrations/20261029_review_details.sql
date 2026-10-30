-- Exibe ao revisor apenas os dados de uma solicitação ainda pendente.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.
create or replace function public.get_review_request(p_raw_token text)
returns table(
  external_id text,
  requester_name text,
  requester_email text,
  description text,
  category text,
  priority text,
  confidence numeric,
  summary text,
  status text
)
language sql security definer set search_path = public as $$
  select
    d.external_id,
    d.requester_name,
    d.requester_email,
    d.description,
    d.category,
    d.priority,
    d.confidence,
    d.summary,
    d.status
  from public.demands d
  where d.approval_token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
    and d.status = 'pending_approval'
  limit 1;
$$;

revoke all on function public.get_review_request(text) from public;
grant execute on function public.get_review_request(text) to service_role;
