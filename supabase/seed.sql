begin;

insert into public.packs (
  slug,
  title,
  description,
  design_key,
  theme_key,
  sort_order,
  is_published
)
values
  (
    'go-alone',
    'Doing Things Alone',
    'Do the things you want to do — even when no one comes with you.',
    'doing-things-alone',
    'go-alone',
    10,
    true
  ),
  (
    'talk-first',
    'TALK FIRST',
    'Start small conversations before your fear does.',
    'field-edition',
    'talk-first',
    20,
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

-- Keep retired Doing Things Alone rows for historical foreign keys, but only
-- the final v1.0 public set is eligible for the production carousel.
update public.missions
set is_published = false,
    updated_at = now()
where pack_id = (select id from public.packs where slug = 'go-alone');

insert into public.missions (
  pack_id,
  slug,
  title,
  note,
  tag,
  code,
  theme_key,
  artwork_key,
  sort_order,
  is_published
)
select
  packs.id,
  missions.slug,
  missions.title,
  missions.note,
  missions.tag,
  missions.code,
  missions.theme_key,
  missions.artwork_key,
  missions.sort_order,
  missions.is_published
from public.packs
join (
  values
    ('go-alone', 'stay-awhile', 'Stay Awhile', 'Spend 15 minutes alone in a public place. Pick a park, plaza, campus space, lobby, waterfront, public seating area, or anywhere people naturally spend time. Try not to use your phone just to make yourself look busy.', 'DOING THINGS ALONE', '01', 'paper', 'circle', 10, true),
    ('go-alone', 'eat-outside-alone', 'Eat Outside Alone', 'Take something to eat or drink and have it alone in an open public place. A park bench, campus area, plaza, waterfront, public square, or another safe public space works. Stay until you''re finished.', 'DOING THINGS ALONE', '02', 'paper', 'circle', 20, true),
    ('go-alone', 'lunch-for-one', 'Lunch for One', 'Have a full meal somewhere by yourself. Use a cafeteria, food court, canteen, casual restaurant, or another place with public seating. Eat there instead of taking it away.', 'DOING THINGS ALONE', '03', 'paper', 'circle', 30, true),
    ('go-alone', 'browse-alone', 'Browse Alone', 'Go somewhere you can browse at your own pace and stay for at least 30 minutes. A bookstore, library, market, shopping area, record store, hobby shop, or similar place works. Don''t rush just because you''re there alone.', 'DOING THINGS ALONE', '04', 'paper', 'circle', 40, true),
    ('go-alone', 'go-somewhere-new', 'Go Somewhere New', 'Visit a nearby public place you''ve never gone to alone before. It can be a neighborhood, park, waterfront, landmark, public garden, local attraction, or another safe place nearby. Spend at least 30 minutes exploring it.', 'DOING THINGS ALONE', '05', 'paper', 'circle', 50, true),
    ('go-alone', 'sit-in-the-crowd', 'Sit in the Crowd', 'Spend 20 minutes alone somewhere busy. Choose a plaza, food hall, mall common area, campus center, station concourse, busy park, or another safe public space. You''re not waiting for anyone. You''re just there.', 'DOING THINGS ALONE', '06', 'paper', 'circle', 60, true),
    ('go-alone', 'coffee-for-one', 'Coffee for One', 'Go to a café alone and stay for at least 30 minutes. Order something, take a seat, and actually spend time there instead of leaving with it.', 'DOING THINGS ALONE', '07', 'paper', 'circle', 70, true),
    ('go-alone', 'table-for-one', 'Table for One', 'Have a sit-down meal at a restaurant by yourself. Ask for a table for one, order what you actually want, and stay through the meal.', 'DOING THINGS ALONE', '08', 'paper', 'circle', 80, true),
    ('go-alone', 'movie-for-one', 'Movie for One', 'Go watch a movie by yourself. Pick a movie you actually want to see and stay through the whole thing.', 'DOING THINGS ALONE', '09', 'paper', 'circle', 90, true),
    ('go-alone', 'see-it-for-yourself', 'See It for Yourself', 'Go somewhere people visit mainly for the experience — by yourself. Choose something available near you: a museum, gallery, exhibition, local attraction, zoo, aquarium, historic site, public garden, cultural space, or another place people intentionally visit. Stay long enough to experience it at your own pace.', 'DOING THINGS ALONE', '10', 'paper', 'circle', 100, true),
    ('go-alone', 'play-alone', 'Play Alone', 'Do a recreational activity people often do with friends — by yourself. Choose something available near you: an arcade, bowling, karaoke, skating, mini golf, gaming café, billiards, batting cages, or another drop-in recreational activity. Complete at least one proper session or round.', 'DOING THINGS ALONE', '11', 'paper', 'circle', 110, true),
    ('go-alone', 'go-to-something', 'Go to Something', 'Go by yourself to a place where people have gathered for something happening. It can be a local market, fair, campus event, community event, pop-up, open day, public talk, festival, meetup with open attendance, or another public event available near you. Stay for at least 30 minutes.', 'DOING THINGS ALONE', '12', 'paper', 'circle', 120, true),
    ('go-alone', 'show-up-alone', 'Show Up Alone', 'Attend a class, workshop, club session, or organized activity without bringing anyone with you. Stay for the actual session. Don''t just check the place out and leave.', 'DOING THINGS ALONE', '13', 'paper', 'circle', 130, true),
    ('go-alone', 'be-the-only-one', 'Be the Only One', 'Go somewhere alone where you expect most people to arrive with someone else. Choose a safe place or activity available to you. It might be a popular weekend spot, an event, an entertainment venue, a local attraction, a public celebration, a performance, or a busy destination. Stay and do what you came there to do.', 'DOING THINGS ALONE', '14', 'paper', 'circle', 140, true),
    ('go-alone', 'one-hour-out', 'One Hour Out', 'Plan one hour out by yourself — and don''t make it just an errand. Choose at least two things to do while you''re out. For example: walk somewhere → browse somewhere → sit somewhere. The exact activities are up to you.', 'DOING THINGS ALONE', '15', 'paper', 'circle', 150, true),
    ('go-alone', 'spend-the-day-your-way', 'Spend the Day Your Way', 'Plan half a day for yourself and spend it out alone. Choose at least two or three things you genuinely want to do. Don''t turn it into a checklist of errands. Make it a real part of your day.', 'DOING THINGS ALONE', '16', 'paper', 'circle', 160, true),
    ('talk-first', 'ask-recommendation', 'Ask a stranger for a recommendation.', 'Coffee, food, music, anything. Start the conversation before you overthink it.', 'TALK FIRST', '01—A', 'blue', 'square', 10, true),
    ('talk-first', 'say-hello', 'Say hello before they do.', 'Choose one ordinary moment today and be the person who starts the greeting.', 'TALK FIRST', '02—B', 'coral', 'circle', 20, true),
    ('talk-first', 'ask-simple-question', 'Ask someone a simple question.', 'Ask something you could probably figure out yourself. The point is starting the interaction.', 'TALK FIRST', '03—C', 'yellow', 'triangle', 30, true),
    ('talk-first', 'small-compliment', 'Give someone a simple compliment.', 'Say it once, clearly, without turning it into a joke or explaining yourself.', 'TALK FIRST', '04—D', 'paper', 'ring', 40, true),
    ('talk-first', 'shared-moment', 'Comment on something happening around you.', 'Use the situation you are both already in as the opening. One sentence is enough.', 'TALK FIRST', '05—E', 'ink', 'diamond', 50, true)
) as missions(
  pack_slug,
  slug,
  title,
  note,
  tag,
  code,
  theme_key,
  artwork_key,
  sort_order,
  is_published
)
  on missions.pack_slug = packs.slug
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
