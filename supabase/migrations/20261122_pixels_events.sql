-- Public pixel config (only px_* keys, IDs are public by nature)
create or replace function public.site_config()
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.app_settings where key like 'px\_%';
$$;
revoke all on function public.site_config() from public;
grant execute on function public.site_config() to anon, authenticated;

-- Event analytics for admin (invoker → RLS on events applies: admins only)
create or replace function public.admin_event_stats(p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable set search_path to '' as $$
with e as (select * from public.events where created_at>=p_from and created_at<p_to)
select jsonb_build_object(
  'types', coalesce((select jsonb_agg(jsonb_build_object('type',type,'n',n,'u',u) order by n desc)
     from (select type, count(*) n, count(distinct visit_id) u from e group by type) t),'[]'::jsonb),
  'questions', coalesce((select jsonb_agg(jsonb_build_object('n',q,'u',u,'ok',ok,'bad',bad) order by q)
     from (select (data->>'n')::int q, count(distinct visit_id) u,
                  count(*) filter (where data->>'ok'='true') ok, count(*) filter (where data->>'ok'='false') bad
           from e where type='answer' and data ? 'n' group by 1) t),'[]'::jsonb),
  'hourly', coalesce((select jsonb_agg(jsonb_build_object('h',h,'n',n) order by h)
     from (select extract(hour from created_at at time zone 'Asia/Almaty')::int h, count(distinct visit_id) n
           from e where type='begin' group by 1) t),'[]'::jsonb)
);
$$;
grant execute on function public.admin_event_stats(timestamptz,timestamptz) to authenticated;
