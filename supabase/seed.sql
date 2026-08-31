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
    'GO ALONE',
    'Do things without waiting for company.',
    'field-edition',
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
    ('go-alone', 'movie-alone', 'Go to a movie alone.', 'Pick the film yourself. Buy one ticket. Stay until the credits begin.', 'GO ALONE', '01—A', 'coral', 'circle', 10, true),
    ('go-alone', 'cafe-alone', 'Sit alone in a busy café.', 'No laptop shield. No pretending to wait for someone. Stay for twenty minutes.', 'GO ALONE', '02—B', 'paper', 'ring', 20, true),
    ('go-alone', 'eat-alone', 'Eat one meal out by yourself.', 'Choose somewhere you actually want to eat. Sit down, order, and finish without hiding behind your phone.', 'GO ALONE', '03—C', 'yellow', 'triangle', 30, true),
    ('go-alone', 'explore-alone', 'Explore somewhere nearby alone.', 'Choose a place you have not properly explored before and spend at least thirty minutes there.', 'GO ALONE', '04—D', 'blue', 'square', 40, true),
    ('go-alone', 'stay-alone', 'Stay somewhere alone without looking busy.', 'Sit in a public place for fifteen minutes. You do not need to work, scroll, or pretend to wait for anyone.', 'GO ALONE', '05—E', 'ink', 'diamond', 50, true),
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
