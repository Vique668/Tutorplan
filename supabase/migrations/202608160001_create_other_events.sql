create table public.other_events (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  title text not null,
  event_date date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  notes text,
  created_at timestamptz not null default now()
);

create index other_events_tutor_id_idx
  on public.other_events (tutor_id);

create index other_events_event_date_idx
  on public.other_events (event_date);
