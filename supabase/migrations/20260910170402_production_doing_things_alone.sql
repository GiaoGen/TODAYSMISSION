begin;

insert into public.packs (
  slug, title, description, design_key, theme_key, sort_order, is_published
)
values (
  'go-alone',
  'Doing Things Alone',
  'Do the things you want to do — even when no one comes with you.',
  'doing-things-alone',
  'go-alone',
  10,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  design_key = excluded.design_key,
  theme_key = excluded.theme_key,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();

-- Retired Mission rows remain in place so historical completions keep their
-- foreign keys. Release only commitments that point at the obsolete set.
update public.pack_memberships as membership
set active_mission_id = null
where membership.pack_id = (select id from public.packs where slug = 'go-alone')
  and membership.active_mission_id is not null
  and not exists (
    select 1
    from public.missions as mission
    where mission.id = membership.active_mission_id
      and mission.slug in (
        'stay-awhile', 'eat-outside-alone', 'lunch-for-one', 'browse-alone',
        'go-somewhere-new', 'sit-in-the-crowd', 'coffee-for-one', 'table-for-one',
        'movie-for-one', 'see-it-for-yourself', 'play-alone', 'go-to-something',
        'show-up-alone', 'be-the-only-one', 'one-hour-out', 'spend-the-day-your-way'
      )
  );

update public.missions
set is_published = false,
    updated_at = now()
where pack_id = (select id from public.packs where slug = 'go-alone');

insert into public.missions (
  pack_id, slug, title, note, tag, code, theme_key, artwork_key, sort_order, is_published
)
select
  pack.id,
  mission.slug,
  mission.title,
  mission.note,
  'DOING THINGS ALONE',
  mission.code,
  'paper',
  'circle',
  mission.sort_order,
  true
from public.packs as pack
cross join (
  values
    ('stay-awhile', 'Stay Awhile', 'Spend 15 minutes alone in a public place. Pick a park, plaza, campus space, lobby, waterfront, public seating area, or anywhere people naturally spend time. Try not to use your phone just to make yourself look busy.', '01', 10),
    ('eat-outside-alone', 'Eat Outside Alone', 'Take something to eat or drink and have it alone in an open public place. A park bench, campus area, plaza, waterfront, public square, or another safe public space works. Stay until you''re finished.', '02', 20),
    ('lunch-for-one', 'Lunch for One', 'Have a full meal somewhere by yourself. Use a cafeteria, food court, canteen, casual restaurant, or another place with public seating. Eat there instead of taking it away.', '03', 30),
    ('browse-alone', 'Browse Alone', 'Go somewhere you can browse at your own pace and stay for at least 30 minutes. A bookstore, library, market, shopping area, record store, hobby shop, or similar place works. Don''t rush just because you''re there alone.', '04', 40),
    ('go-somewhere-new', 'Go Somewhere New', 'Visit a nearby public place you''ve never gone to alone before. It can be a neighborhood, park, waterfront, landmark, public garden, local attraction, or another safe place nearby. Spend at least 30 minutes exploring it.', '05', 50),
    ('sit-in-the-crowd', 'Sit in the Crowd', 'Spend 20 minutes alone somewhere busy. Choose a plaza, food hall, mall common area, campus center, station concourse, busy park, or another safe public space. You''re not waiting for anyone. You''re just there.', '06', 60),
    ('coffee-for-one', 'Coffee for One', 'Go to a café alone and stay for at least 30 minutes. Order something, take a seat, and actually spend time there instead of leaving with it.', '07', 70),
    ('table-for-one', 'Table for One', 'Have a sit-down meal at a restaurant by yourself. Ask for a table for one, order what you actually want, and stay through the meal.', '08', 80),
    ('movie-for-one', 'Movie for One', 'Go watch a movie by yourself. Pick a movie you actually want to see and stay through the whole thing.', '09', 90),
    ('see-it-for-yourself', 'See It for Yourself', 'Go somewhere people visit mainly for the experience — by yourself. Choose something available near you: a museum, gallery, exhibition, local attraction, zoo, aquarium, historic site, public garden, cultural space, or another place people intentionally visit. Stay long enough to experience it at your own pace.', '10', 100),
    ('play-alone', 'Play Alone', 'Do a recreational activity people often do with friends — by yourself. Choose something available near you: an arcade, bowling, karaoke, skating, mini golf, gaming café, billiards, batting cages, or another drop-in recreational activity. Complete at least one proper session or round.', '11', 110),
    ('go-to-something', 'Go to Something', 'Go by yourself to a place where people have gathered for something happening. It can be a local market, fair, campus event, community event, pop-up, open day, public talk, festival, meetup with open attendance, or another public event available near you. Stay for at least 30 minutes.', '12', 120),
    ('show-up-alone', 'Show Up Alone', 'Attend a class, workshop, club session, or organized activity without bringing anyone with you. Stay for the actual session. Don''t just check the place out and leave.', '13', 130),
    ('be-the-only-one', 'Be the Only One', 'Go somewhere alone where you expect most people to arrive with someone else. Choose a safe place or activity available to you. It might be a popular weekend spot, an event, an entertainment venue, a local attraction, a public celebration, a performance, or a busy destination. Stay and do what you came there to do.', '14', 140),
    ('one-hour-out', 'One Hour Out', 'Plan one hour out by yourself — and don''t make it just an errand. Choose at least two things to do while you''re out. For example: walk somewhere → browse somewhere → sit somewhere. The exact activities are up to you.', '15', 150),
    ('spend-the-day-your-way', 'Spend the Day Your Way', 'Plan half a day for yourself and spend it out alone. Choose at least two or three things you genuinely want to do. Don''t turn it into a checklist of errands. Make it a real part of your day.', '16', 160)
) as mission(slug, title, note, code, sort_order)
where pack.slug = 'go-alone'
on conflict (pack_id, slug) do update set
  title = excluded.title,
  note = excluded.note,
  tag = excluded.tag,
  code = excluded.code,
  theme_key = excluded.theme_key,
  artwork_key = excluded.artwork_key,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published,
  updated_at = now();

commit;
