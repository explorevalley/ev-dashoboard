-- ExploreValley admin — indexes for the queries this dashboard actually runs
--
-- Paste into the Supabase SQL editor and run. It is idempotent: re-running it
-- changes nothing. Every entry is skipped rather than failed when the table or
-- column is absent, so it is safe against a project that does not have the
-- whole schema.
--
-- READ THIS FIRST — an honest sizing note.
--
-- These tables are small. The largest, ev_mart_products, holds ~6,200 rows;
-- most hold fewer than 100. At that size Postgres will often choose a
-- sequential scan no matter what indexes exist, and it will be right to: the
-- whole table is a handful of pages in memory. The measured cost of loading
-- this dashboard was never index lookup time — it was transferring ~11 MB over
-- the network and re-doing it on every request. That part is fixed in code
-- (a read cache and concurrent page fetching in jsondb.ts), not here.
--
-- So what are these for? Two things:
--
--   1. A few are worth it today. The dashboard-credentials lookups run on
--      every single sign-in, and the restaurant_id lookups run per vendor.
--   2. The rest are the groundwork for pushing filtering into SQL instead of
--      loading whole tables into Node and filtering there. That is the real
--      remaining win, and it is only safe to attempt once the supporting
--      indexes exist.
--
-- Indexes are not free: each one adds write cost and storage. If you would
-- rather add only what pays for itself today, run section 1 and stop.
--
-- Note on `id`: no index is created on any `id` column. Those are primary
-- keys, which Postgres already indexes; adding another under a new name would
-- create a genuine duplicate that `if not exists` cannot detect.

do $$
declare
  spec   record;
  col    text;
  usable boolean;
  made   int := 0;
  wanted int := 0;
begin
  for spec in
    select * from (values

      -- ─── 1. Pays for itself today ──────────────────────────────────────

      -- Sign-in. Looked up by username, and by (scope, username) for the
      -- scoped dashboards. Runs on every login attempt.
      ('ev_dashboard_credentials', 'ev_dash_cred_username_idx',       '(username)',                          'username'),
      ('ev_dashboard_credentials', 'ev_dash_cred_scope_username_idx', '(scope, username)',                   'scope,username'),
      ('ev_dashboard_credentials', 'ev_dash_cred_updated_idx',        '(updated_at desc nulls last)',        'updated_at'),

      -- Menus are fetched per restaurant — seven distinct `restaurant_id=eq.`
      -- call sites across the routes.
      ('ev_food_menu_items',       'ev_food_menu_items_restaurant_idx',  '(restaurant_id)',                  'restaurant_id'),
      ('ev_menu_items',            'ev_menu_items_restaurant_idx',       '(restaurant_id)',                  'restaurant_id'),
      ('ev_food_vendor_menus',     'ev_food_vendor_menus_restaurant_idx','(restaurant_id)',                  'restaurant_id'),
      ('ev_vendor_menus',          'ev_vendor_menus_restaurant_idx',     '(restaurant_id)',                  'restaurant_id'),

      -- Mart products are filtered by partner; the partner list is ordered by
      -- updated_at desc nulls last, which this matches exactly.
      ('ev_mart_products',         'ev_mart_products_partner_idx',    '(mart_partner_id)',                   'mart_partner_id'),
      ('ev_mart_partners',         'ev_mart_partners_updated_idx',    '(updated_at desc nulls last)',        'updated_at'),
      ('ev_mart_partners',         'ev_mart_partners_username_idx',   '(username)',                          'username'),

      -- Full-table reads page with ORDER BY on these columns, so the index
      -- lets Postgres skip a sort per page.
      ('ev_analytics_events',      'ev_analytics_events_at_idx',      '(at desc)',                           'at'),
      ('ev_audit_log',             'ev_audit_log_at_idx',             '(at desc)',                           'at'),

      -- ─── 2. Groundwork for pushing filters into SQL ────────────────────
      -- Currently the dashboard loads these tables whole and filters in Node.
      -- These indexes are what make it safe to stop doing that.

      ('ev_food_orders',           'ev_food_orders_status_idx',       '(status)',                            'status'),
      ('ev_food_orders',           'ev_food_orders_user_idx',         '(user_id)',                           'user_id'),
      ('ev_food_orders',           'ev_food_orders_restaurant_idx',   '(restaurant_id)',                     'restaurant_id'),

      ('ev_mart_orders',           'ev_mart_orders_status_idx',       '(status)',                            'status'),
      ('ev_mart_orders',           'ev_mart_orders_user_idx',         '(user_id)',                           'user_id'),

      ('ev_cab_bookings',          'ev_cab_bookings_status_idx',      '(status)',                            'status'),
      ('ev_cab_bookings',          'ev_cab_bookings_created_idx',     '(created_at desc)',                   'created_at'),
      ('ev_cab_bookings',          'ev_cab_bookings_user_idx',        '(user_id)',                           'user_id'),

      ('ev_bookings',              'ev_bookings_status_idx',          '(status)',                            'status'),
      ('ev_bookings',              'ev_bookings_type_idx',            '(type)',                              'type'),

      ('ev_queries',               'ev_queries_status_idx',           '(status)',                            'status'),

      ('ev_cab_bids',              'ev_cab_bids_driver_status_idx',   '(driver_id, status)',                 'driver_id,status'),
      ('ev_ride_assignments',      'ev_ride_assign_driver_status_idx','(driver_id, status)',                 'driver_id,status'),
      ('ev_drivers',               'ev_drivers_phone_idx',            '(phone)',                             'phone'),

      ('ev_user_profiles',         'ev_user_profiles_phone_idx',      '(phone)',                             'phone'),
      ('ev_user_profiles',         'ev_user_profiles_updated_idx',    '(updated_at desc nulls last)',        'updated_at'),
      ('ev_user_behavior_profiles','ev_user_behavior_updated_idx',    '(updated_at desc nulls last)',        'updated_at'),

      ('ev_site_pages',            'ev_site_pages_updated_idx',       '(updated_at desc nulls last)',        'updated_at')

    ) as t(tbl, idx, expr, cols)
  loop
    wanted := wanted + 1;

    if to_regclass('public.' || spec.tbl) is null then
      raise notice 'skip  % — table %I does not exist', spec.idx, spec.tbl;
      continue;
    end if;

    usable := true;
    foreach col in array string_to_array(spec.cols, ',') loop
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name   = spec.tbl
          and column_name  = btrim(col)
      ) then
        raise notice 'skip  % — %.% does not exist', spec.idx, spec.tbl, btrim(col);
        usable := false;
      end if;
    end loop;

    if usable then
      execute format('create index if not exists %I on public.%I %s', spec.idx, spec.tbl, spec.expr);
      made := made + 1;
    end if;
  end loop;

  raise notice '---';
  raise notice 'ensured % of % indexes', made, wanted;
end $$;

-- Refresh planner statistics so the new indexes are actually considered.
do $$
declare
  t text;
begin
  foreach t in array array[
    'ev_dashboard_credentials','ev_food_menu_items','ev_menu_items',
    'ev_food_vendor_menus','ev_vendor_menus','ev_mart_products',
    'ev_mart_partners','ev_food_orders','ev_mart_orders','ev_cab_bookings',
    'ev_bookings','ev_queries','ev_cab_bids','ev_ride_assignments',
    'ev_drivers','ev_user_profiles','ev_user_behavior_profiles',
    'ev_analytics_events','ev_audit_log','ev_site_pages'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('analyze public.%I', t);
    end if;
  end loop;
end $$;


-- ─── Afterwards: check what you actually got ──────────────────────────────
--
-- select tablename, indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public' and tablename like 'ev\_%'
-- order by tablename, indexname;
--
-- And once there has been some traffic, this shows which indexes are earning
-- their keep. Anything sitting at idx_scan = 0 after a week of normal use is a
-- candidate for dropping:
--
-- select relname as table, indexrelname as index, idx_scan, idx_tup_read
-- from pg_stat_user_indexes
-- where schemaname = 'public' and relname like 'ev\_%'
-- order by idx_scan asc, relname;
