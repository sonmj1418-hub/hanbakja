-- ShortsAI 사용 집계. 설치마다 install_id가 다르고, 줄은 이 세 표를 같이 쓴다.
-- event_id는 설치 안에서만이 아니라 표 전체에서 유일해서, 다시 보내도 줄이 늘지 않는다.
--
-- publishable 키(anon)는 INSERT와, 요청 헤더 x-install-id와 같은 install_id의 삭제만 할 수 있다.
-- 표에 직접 DELETE 하면 PostgREST가 SELECT 권한을 요구한다. 그 권한은 주지 않고,
-- public.delete_own_usage()가 헤더와 같은 install_id만 지운다.
-- anon에게 SELECT 권한과 SELECT 정책은 없다. 다른 설치의 줄은 읽지 못한다.
-- 앱은 on_conflict upsert를 쓰지 않는다. 그 요청도 SELECT 권한 없이 거절된다.
-- 소유자는 Supabase 대시보드(Table Editor 또는 SQL)에서 service_role로 모든 설치를 본다.
-- service_role은 RLS를 우회한다. 예: select * from public.sessions order by started_at;
-- service_role 키는 앱에 넣지 않는다.

create table if not exists public.sessions (
  event_id text primary key,
  install_id text not null,
  target text not null,
  source text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_sec double precision not null,
  clip_count integer not null,
  constraint sessions_install_event unique (install_id, event_id)
);

create index if not exists sessions_install on public.sessions (install_id);

create table if not exists public.interventions (
  event_id text primary key,
  install_id text not null,
  created_at timestamptz not null,
  weekday integer not null,
  intensity integer not null,
  stage text,
  method text,
  commit_minutes integer not null default 0,
  card_correct boolean,
  outcome text not null,
  reentered_within_30min boolean,
  policy_version text,
  constraint interventions_install_event unique (install_id, event_id)
);

create index if not exists interventions_install on public.interventions (install_id);

create table if not exists public.lock_attempts (
  event_id text primary key,
  install_id text not null,
  created_at timestamptz not null,
  remaining_sec integer not null,
  constraint lock_attempts_install_event unique (install_id, event_id)
);

create index if not exists lock_attempts_install on public.lock_attempts (install_id);

alter table public.sessions enable row level security;
alter table public.interventions enable row level security;
alter table public.lock_attempts enable row level security;

create or replace function public.usage_install_id()
returns text
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  headers text;
  from_json text;
  from_guc text;
begin
  headers := nullif(current_setting('request.headers', true), '');
  if headers is not null then
    begin
      from_json := headers::json->>'x-install-id';
    exception when others then
      from_json := null;
    end;
  end if;
  if nullif(btrim(coalesce(from_json, '')), '') is not null then
    return btrim(from_json);
  end if;
  begin
    from_guc := current_setting('request.header.x-install-id', true);
  exception when others then
    from_guc := null;
  end;
  return nullif(btrim(coalesce(from_guc, '')), '');
end;
$$;

revoke all on function public.usage_install_id() from public;
grant execute on function public.usage_install_id() to anon, authenticated, service_role;

revoke all on table public.sessions from anon, authenticated;
revoke all on table public.interventions from anon, authenticated;
revoke all on table public.lock_attempts from anon, authenticated;

grant insert, delete on table public.sessions to anon, authenticated;
grant insert, delete on table public.interventions to anon, authenticated;
grant insert, delete on table public.lock_attempts to anon, authenticated;

grant select, insert, update, delete on table public.sessions to service_role;
grant select, insert, update, delete on table public.interventions to service_role;
grant select, insert, update, delete on table public.lock_attempts to service_role;

drop policy if exists sessions_insert_own on public.sessions;
create policy sessions_insert_own
  on public.sessions
  for insert
  to anon, authenticated
  with check (install_id = public.usage_install_id());

drop policy if exists sessions_delete_own on public.sessions;
create policy sessions_delete_own
  on public.sessions
  for delete
  to anon, authenticated
  using (install_id = public.usage_install_id());

drop policy if exists interventions_insert_own on public.interventions;
create policy interventions_insert_own
  on public.interventions
  for insert
  to anon, authenticated
  with check (install_id = public.usage_install_id());

drop policy if exists interventions_delete_own on public.interventions;
create policy interventions_delete_own
  on public.interventions
  for delete
  to anon, authenticated
  using (install_id = public.usage_install_id());

drop policy if exists lock_attempts_insert_own on public.lock_attempts;
create policy lock_attempts_insert_own
  on public.lock_attempts
  for insert
  to anon, authenticated
  with check (install_id = public.usage_install_id());

drop policy if exists lock_attempts_delete_own on public.lock_attempts;
create policy lock_attempts_delete_own
  on public.lock_attempts
  for delete
  to anon, authenticated
  using (install_id = public.usage_install_id());

-- 표 DELETE는 PostgREST가 SELECT를 요구한다. 이 함수는 소유자 권한으로
-- 헤더 x-install-id와 같은 줄만 지우고, 읽기 결과는 돌려주지 않는다.
create or replace function public.delete_own_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  install text := public.usage_install_id();
begin
  if install is null then
    raise exception 'install id required' using errcode = '42501';
  end if;
  delete from public.sessions where install_id = install;
  delete from public.interventions where install_id = install;
  delete from public.lock_attempts where install_id = install;
end;
$$;

revoke all on function public.delete_own_usage() from public;
grant execute on function public.delete_own_usage() to anon, authenticated, service_role;
