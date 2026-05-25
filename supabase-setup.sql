-- ZeaYou mockup feedback — one-time setup
-- Run this in Supabase Studio SQL editor:
--   https://supabase.com/dashboard/project/lpptlfuhnyhciqhimoxa/sql/new
--
-- After running, also do this in the Dashboard UI:
--   Settings → API → Exposed schemas → add 'dev_portal' → Save

create schema if not exists dev_portal;

create table if not exists dev_portal.mockup_feedback (
  id                  uuid        primary key default gen_random_uuid(),
  mockup_url          text        not null,
  page_hash           text,
  selection_x         integer     not null,
  selection_y         integer     not null,
  selection_w         integer     not null,
  selection_h         integer     not null,
  viewport_w          integer     not null,
  viewport_h          integer     not null,
  device_pixel_ratio  numeric(3,2),
  user_agent          text,
  comment             text        not null,
  author_name         text,
  created_at          timestamptz not null default now(),
  resolved            boolean     not null default false,
  resolved_at         timestamptz,
  resolved_note       text
);

alter table dev_portal.mockup_feedback enable row level security;

-- anon (browser visitor) can only insert with a non-empty comment
drop policy if exists mockup_feedback_insert_anon on dev_portal.mockup_feedback;
create policy mockup_feedback_insert_anon
  on dev_portal.mockup_feedback for insert to anon
  with check (
    length(coalesce(comment, '')) between 1 and 4000
    and selection_w > 0
    and selection_h > 0
  );

-- authenticated (Erik in Supabase Studio) can read & update
drop policy if exists mockup_feedback_select_auth on dev_portal.mockup_feedback;
create policy mockup_feedback_select_auth
  on dev_portal.mockup_feedback for select to authenticated using (true);

drop policy if exists mockup_feedback_update_auth on dev_portal.mockup_feedback;
create policy mockup_feedback_update_auth
  on dev_portal.mockup_feedback for update to authenticated using (true);

-- helpful index for "show me new feedback" queries
create index if not exists mockup_feedback_open_idx
  on dev_portal.mockup_feedback (resolved, created_at desc);
