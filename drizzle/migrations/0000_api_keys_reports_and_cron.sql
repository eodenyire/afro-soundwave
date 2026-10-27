-- Public API v1: API keys, request logs, daily reports

create extension if not exists pgcrypto;

-- ============ api_keys ============
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{content}',
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

grant select, insert on public.api_keys to authenticated;
grant all on public.api_keys to service_role;

alter table public.api_keys enable row level security;

create policy "owners and admins can view api keys"
  on public.api_keys for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "owners can create api keys"
  on public.api_keys for insert to authenticated
  with check (user_id = auth.uid());

-- ============ api_request_logs (service-only) ============
create table public.api_request_logs (
  id bigint generated always as identity primary key,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  endpoint text not null,
  status_code int not null,
  created_at timestamptz not null default now()
);

grant all on public.api_request_logs to service_role;

alter table public.api_request_logs enable row level security;

-- ============ daily reports ============
create table public.daily_reports (
  report_date date not null,
  subject_type text not null check (subject_type in ('creator','advertiser')),
  subject_id uuid not null,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (report_date, subject_type, subject_id)
);

grant select on public.daily_reports to authenticated;
grant all on public.daily_reports to service_role;

alter table public.daily_reports enable row level security;

create policy "owners and admins can view daily reports"
  on public.daily_reports for select to authenticated
  using (
    (subject_type = 'creator' and subject_id = auth.uid())
    or (subject_type = 'advertiser' and exists (
      select 1 from public.advertisers a where a.id = subject_id and a.user_id = auth.uid()
    ))
    or public.has_role(auth.uid(), 'admin')
  );

-- ============ key management RPCs ============
create or replace function public.create_api_key(p_name text, p_scopes text[])
returns table (id uuid, key text, key_prefix text)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_raw text;
  v_id uuid;
  v_prefix text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or length(btrim(p_name)) < 1 or length(p_name) > 80 then
    raise exception 'name must be 1-80 characters';
  end if;
  if exists (
    select 1 from unnest(coalesce(p_scopes, array[]::text[])) s
    where s not in ('content','analytics','ads','monetization','all')
  ) then
    raise exception 'invalid scope; allowed: content, analytics, ads, monetization, all';
  end if;
  if array_length(p_scopes, 1) = 0 then
    raise exception 'at least one scope is required';
  end if;

  v_raw := 'aftb_sk_' || replace(replace(replace(
    encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');

  insert into public.api_keys (user_id, name, key_prefix, key_hash, scopes)
  values (
    v_user, btrim(p_name), left(v_raw, 14),
    encode(digest(v_raw, 'sha256'), 'hex'),
    p_scopes
  )
  returning api_keys.id, api_keys.key_prefix into v_id, v_prefix;

  return query select v_id, v_raw, v_prefix;
end $$;

create or replace function public.revoke_api_key(p_key_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.api_keys k
    where k.id = p_key_id
      and (k.user_id = v_user or public.has_role(v_user, 'admin'))
  ) then
    raise exception 'key not found or not permitted';
  end if;
  update public.api_keys
  set status = 'revoked', revoked_at = now()
  where id = p_key_id and status = 'active';
end $$;

create or replace function public.list_api_keys(p_all boolean default false)
returns table (
  id uuid, user_id uuid, name text, key_prefix text, scopes text[],
  status text, created_at timestamptz, last_used_at timestamptz,
  revoked_at timestamptz, owner_name text
)
language sql security definer set search_path = public as $$
  select k.id, k.user_id, k.name, k.key_prefix, k.scopes,
         k.status, k.created_at, k.last_used_at, k.revoked_at,
         p.display_name
  from public.api_keys k
  left join public.profiles p on p.user_id = k.user_id
  where
    (p_all = false and k.user_id = auth.uid())
    or (p_all = true and public.has_role(auth.uid(), 'admin'))
  order by k.created_at desc;
$$;

create or replace function public.get_api_key_usage()
returns table (
  api_key_id uuid, name text, key_prefix text, status text,
  requests_24h bigint, requests_7d bigint, last_used_at timestamptz
)
language sql security definer set search_path = public as $$
  select k.id, k.name, k.key_prefix, k.status,
    (select count(*) from public.api_request_logs l
      where l.api_key_id = k.id and l.created_at > now() - interval '24 hours'),
    (select count(*) from public.api_request_logs l
      where l.api_key_id = k.id and l.created_at > now() - interval '7 days'),
    k.last_used_at
  from public.api_keys k
  where k.user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  order by k.created_at desc;
$$;

grant execute on function public.create_api_key(text, text[]) to authenticated;
grant execute on function public.revoke_api_key(uuid) to authenticated;
grant execute on function public.list_api_keys(boolean) to authenticated;
grant execute on function public.get_api_key_usage() to authenticated;

-- ============ daily report generation ============
create or replace function public.generate_daily_reports(p_date date default null)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_date date := coalesce(p_date, (now() - interval '1 day')::date);
  v_count integer;
begin
  -- Creators: views, watch time, ad earnings, super chat earnings
  insert into public.daily_reports (report_date, subject_type, subject_id, metrics)
  select v_date, 'creator', wh.creator_id,
    jsonb_build_object(
      'views', coalesce(wh.views, 0),
      'watch_seconds', coalesce(wh.watch_seconds, 0),
      'ad_earnings_cents', coalesce(ad.earnings_cents, 0),
      'super_chat_cents', coalesce(sc.total_cents, 0)
    )
  from (
    select creator_id, count(*) as views, sum(watch_seconds) as watch_seconds
    from public.watch_history
    where created_at::date = v_date
    group by creator_id
  ) wh
  left join (
    select creator_id, sum(creator_share_cents) as earnings_cents
    from public.ad_events
    where created_at::date = v_date
    group by creator_id
  ) ad on ad.creator_id = wh.creator_id
  left join (
    select ls.creator_id, round(sum(s.amount_usd) * 70) as total_cents
    from public.live_super_chats s
    join public.live_streams ls on ls.id = s.stream_id
    where s.created_at::date = v_date
    group by ls.creator_id
  ) sc on sc.creator_id = wh.creator_id
  on conflict (report_date, subject_type, subject_id)
  do update set metrics = excluded.metrics, generated_at = now();

  -- Advertisers: impressions, clicks, spend
  insert into public.daily_reports (report_date, subject_type, subject_id, metrics)
  select v_date, 'advertiser', c.advertiser_id,
    jsonb_build_object(
      'impressions', coalesce(count(*) filter (where e.event_type = 'impression'), 0),
      'clicks', coalesce(count(*) filter (where e.event_type = 'click'), 0),
      'spend_cents', coalesce(sum(e.revenue_cents), 0)
    )
  from public.ad_events e
  join public.ad_campaigns c on c.id = e.campaign_id
  where e.created_at::date = v_date
  group by c.advertiser_id
  on conflict (report_date, subject_type, subject_id)
  do update set metrics = excluded.metrics, generated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.generate_daily_reports(date) to authenticated;

-- ============ nightly schedule ============
create extension if not exists pg_cron;

select cron.unschedule('afritube-daily-reports')
where exists (select 1 from cron.job where jobname = 'afritube-daily-reports');

select cron.schedule(
  'afritube-daily-reports',
  '30 1 * * *',
  $$select public.generate_daily_reports()$$
);
