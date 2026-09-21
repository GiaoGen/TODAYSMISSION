begin;

-- Restore the three current Explore Packs from the approved content handoffs.
-- UUIDs remain database-owned; all application references use the returned IDs.
insert into public.packs (
  slug, title, description, design_key, theme_key, sort_order, is_published
)
values
  (
    'doing-things-alone',
    'Doing Things Alone',
    $$Do the things you want to do — even when no one comes with you.$$,
    'doing-things-alone',
    'go-alone',
    10,
    true
  ),
  (
    'fear-of-rejection',
    'Fear of Rejection',
    $$Ask for what you want—even when no is possible.$$,
    'field-edition',
    'get-rejected',
    20,
    true
  ),
  (
    'talking-to-strangers',
    'Talking to Strangers',
    $$Stop waiting for the other person to speak first.$$,
    'field-edition',
    'be-seen',
    30,
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

-- A content release can retire a previously published row without deleting it.
-- This preserves historical foreign keys while keeping the public set exact.
update public.missions
set is_published = false,
    updated_at = now()
where pack_id in (
  select id from public.packs
  where slug in ('doing-things-alone', 'fear-of-rejection', 'talking-to-strangers')
);

insert into public.missions (
  pack_id, slug, title, note, tag, code, theme_key, artwork_key, sort_order, is_published
)
select
  pack.id,
  mission.slug,
  mission.title,
  mission.note,
  mission.tag,
  mission.code,
  mission.theme_key,
  mission.artwork_key,
  mission.sort_order,
  true
from public.packs as pack
join (
  values
    ('doing-things-alone', 'stay-awhile', 'Stay Awhile', $$Spend 15 minutes alone in a public place. Pick a park, plaza, campus space, lobby, waterfront, public seating area, or anywhere people naturally spend time. Try not to use your phone just to make yourself look busy.$$ , 'DOING THINGS ALONE', '01', 'paper', 'circle', 10),
    ('doing-things-alone', 'eat-outside-alone', 'Eat Outside Alone', $$Take something to eat or drink and have it alone in an open public place. A park bench, campus area, plaza, waterfront, public square, or another safe public space works. Stay until you’re finished.$$ , 'DOING THINGS ALONE', '02', 'paper', 'circle', 20),
    ('doing-things-alone', 'lunch-for-one', 'Lunch for One', $$Have a full meal somewhere by yourself. Use a cafeteria, food court, canteen, casual restaurant, or another place with public seating. Eat there instead of taking it away.$$ , 'DOING THINGS ALONE', '03', 'paper', 'circle', 30),
    ('doing-things-alone', 'browse-alone', 'Browse Alone', $$Go somewhere you can browse at your own pace and stay for at least 30 minutes. A bookstore, library, market, shopping area, record store, hobby shop, or similar place works. Don’t rush just because you’re there alone.$$ , 'DOING THINGS ALONE', '04', 'paper', 'circle', 40),
    ('doing-things-alone', 'go-somewhere-new', 'Go Somewhere New', $$Visit a nearby public place you’ve never gone to alone before. It can be a neighborhood, park, waterfront, landmark, public garden, local attraction, or another safe place nearby. Spend at least 30 minutes exploring it.$$ , 'DOING THINGS ALONE', '05', 'paper', 'circle', 50),
    ('doing-things-alone', 'sit-in-the-crowd', 'Sit in the Crowd', $$Spend 20 minutes alone somewhere busy. Choose a plaza, food hall, mall common area, campus center, station concourse, busy park, or another safe public space. You’re not waiting for anyone. You’re just there.$$ , 'DOING THINGS ALONE', '06', 'paper', 'circle', 60),
    ('doing-things-alone', 'coffee-for-one', 'Coffee for One', $$Go to a café alone and stay for at least 30 minutes. Order something, take a seat, and actually spend time there instead of leaving with it.$$ , 'DOING THINGS ALONE', '07', 'paper', 'circle', 70),
    ('doing-things-alone', 'table-for-one', 'Table for One', $$Have a sit-down meal at a restaurant by yourself. Ask for a table for one, order what you actually want, and stay through the meal.$$ , 'DOING THINGS ALONE', '08', 'paper', 'circle', 80),
    ('doing-things-alone', 'movie-for-one', 'Movie for One', $$Go watch a movie by yourself. Pick a movie you actually want to see and stay through the whole thing.$$ , 'DOING THINGS ALONE', '09', 'paper', 'circle', 90),
    ('doing-things-alone', 'see-it-for-yourself', 'See It for Yourself', $$Go somewhere people visit mainly for the experience — by yourself. Choose something available near you: a museum, gallery, exhibition, local attraction, zoo, aquarium, historic site, public garden, cultural space, or another place people intentionally visit. Stay long enough to experience it at your own pace.$$ , 'DOING THINGS ALONE', '10', 'paper', 'circle', 100),
    ('doing-things-alone', 'play-alone', 'Play Alone', $$Do a recreational activity people often do with friends — by yourself. Choose something available near you: an arcade, bowling, karaoke, skating, mini golf, gaming café, billiards, batting cages, or another drop-in recreational activity. Complete at least one proper session or round.$$ , 'DOING THINGS ALONE', '11', 'paper', 'circle', 110),
    ('doing-things-alone', 'go-to-something', 'Go to Something', $$Go by yourself to a place where people have gathered for something happening. It can be a local market, fair, campus event, community event, pop-up, open day, public talk, festival, meetup with open attendance, or another public event available near you. Stay for at least 30 minutes.$$ , 'DOING THINGS ALONE', '12', 'paper', 'circle', 120),
    ('doing-things-alone', 'show-up-alone', 'Show Up Alone', $$Attend a class, workshop, club session, or organized activity without bringing anyone with you. Stay for the actual session. Don’t just check the place out and leave.$$ , 'DOING THINGS ALONE', '13', 'paper', 'circle', 130),
    ('doing-things-alone', 'be-the-only-one', 'Be the Only One', $$Go somewhere alone where you expect most people to arrive with someone else. Choose a safe place or activity available to you. It might be a popular weekend spot, an event, an entertainment venue, a local attraction, a public celebration, a performance, or a busy destination. Stay and do what you came there to do.$$ , 'DOING THINGS ALONE', '14', 'paper', 'circle', 140),
    ('doing-things-alone', 'one-hour-out', 'One Hour Out', $$Plan one hour out by yourself — and don’t make it just an errand. Choose at least two things to do while you’re out. For example: walk somewhere → browse somewhere → sit somewhere. The exact activities are up to you.$$ , 'DOING THINGS ALONE', '15', 'paper', 'circle', 150),
    ('doing-things-alone', 'spend-the-day-your-way', 'Spend the Day Your Way', $$Plan half a day for yourself and spend it out alone. Choose at least two or three things you genuinely want to do. Don’t turn it into a checklist of errands. Make it a real part of your day.$$ , 'DOING THINGS ALONE', '16', 'paper', 'circle', 160),

    ('fear-of-rejection', 'one-small-ask', 'One Small Ask', $$Ask an appropriate person for one small, specific, optional thing that would genuinely make your day easier. Make it easy for them to answer yes or no.$$ , 'FEAR OF REJECTION', '01', 'paper', 'circle', 10),
    ('fear-of-rejection', 'put-your-preference-on-the-table', 'Put Your Preference on the Table', $$During a real shared choice, state the option you genuinely prefer and ask whether the other person or group is willing to choose it.$$ , 'FEAR OF REJECTION', '02', 'paper', 'circle', 20),
    ('fear-of-rejection', 'ask-before-you-are-stuck', 'Ask Before You Are Stuck', $$Ask a person reasonably placed to help for one bounded piece of guidance on something you are genuinely trying to do—before delay or confusion becomes a crisis.$$ , 'FEAR OF REJECTION', '03', 'paper', 'circle', 30),
    ('fear-of-rejection', 'make-the-invitation', 'Make the Invitation', $$Invite someone you already know or naturally share context with to one specific, low-pressure activity you would genuinely like to do together. Include enough detail for them to answer. One invitation is enough.$$ , 'FEAR OF REJECTION', '04', 'paper', 'circle', 40),
    ('fear-of-rejection', 'ask-to-join', 'Ask to Join', $$Ask to join one appropriate activity, plan, or working session that is open enough for the people involved to realistically include you—or decline.$$ , 'FEAR OF REJECTION', '05', 'paper', 'circle', 50),
    ('fear-of-rejection', 'put-your-idea-forward', 'Put Your Idea Forward', $$In a real shared decision, clearly ask a group to consider one idea you genuinely support. State the proposal briefly. Let the group evaluate it without turning the moment into a speech about your worth.$$ , 'FEAR OF REJECTION', '06', 'paper', 'circle', 60),
    ('fear-of-rejection', 'ask-for-their-time', 'Ask for Their Time', $$Ask someone relevant for a specific, bounded amount of time to discuss something that genuinely matters to you. Name the purpose and approximate time. Let them choose whether and when.$$ , 'FEAR OF REJECTION', '07', 'paper', 'circle', 70),
    ('fear-of-rejection', 'request-a-fair-adjustment', 'Request a Fair Adjustment', $$When a real arrangement, service, schedule, or shared process is not working reasonably for you, ask the appropriate person for one fair and specific adjustment.$$ , 'FEAR OF REJECTION', '08', 'paper', 'circle', 80),
    ('fear-of-rejection', 'ask-upward', 'Ask Upward', $$Ask someone with legitimate authority in a setting you already belong to for one reasonable, discretionary thing that would genuinely help you. Choose a request they are actually allowed to consider, not something they are required to grant.$$ , 'FEAR OF REJECTION', '09', 'paper', 'circle', 90),
    ('fear-of-rejection', 'let-the-ask-stand', 'Let the Ask Stand', $$Make one appropriate request in a single clear sentence. Do not erase it inside the sentence with “it doesn’t matter,” “forget it,” or an immediate retreat. Then pause and let the other person answer. Politeness is welcome. Self-cancellation is not required.$$ , 'FEAR OF REJECTION', '10', 'paper', 'circle', 100),
    ('fear-of-rejection', 'follow-up-once', 'Follow Up Once', $$After a reasonable response window has passed on a legitimate request that still matters, send one brief, respectful follow-up and make it easy to decline. Then leave the decision with them.$$ , 'FEAR OF REJECTION', '11', 'paper', 'circle', 110),
    ('fear-of-rejection', 'put-yourself-forward', 'Put Yourself Forward', $$Ask to be considered for one real opportunity, role, contribution, or responsibility you genuinely want—even though selection is not guaranteed.$$ , 'FEAR OF REJECTION', '12', 'paper', 'circle', 120),
    ('fear-of-rejection', 'ask-for-real-support', 'Ask for Real Support', $$Ask a trusted person for one specific form of support you genuinely need, and allow them to say what they can or cannot offer.$$ , 'FEAR OF REJECTION', '13', 'paper', 'circle', 130),

    ('talking-to-strangers', 'hello-first', 'Hello First', $$In a moment when acknowledging each other is natural, greet a stranger before they greet you. A simple hello, hi, good morning, or another natural greeting is enough. You do not need to turn it into a conversation.$$ , 'TALKING TO STRANGERS', '01', 'paper', 'circle', 10),
    ('talking-to-strangers', 'ask-something-real', 'Ask Something Real', $$Ask a stranger one simple question about information you genuinely need and cannot already see. Ask someone who is naturally placed to know or reasonably able to answer. Do not invent a question just to complete the Mission.$$ , 'TALKING TO STRANGERS', '02', 'paper', 'circle', 20),
    ('talking-to-strangers', 'ask-for-their-take', 'Ask for Their Take', $$Ask a stranger for their genuine opinion, experience, or recommendation about something connected to where you both are or what you are both doing. Choose a light, non-sensitive subject. You only need to ask.$$ , 'TALKING TO STRANGERS', '03', 'paper', 'circle', 30),
    ('talking-to-strangers', 'name-the-moment', 'Name the Moment', $$Direct one brief, neutral comment to a stranger about something you are both experiencing. Make it clear you are speaking to them. Leave room for a reply, but do not require one.$$ , 'TALKING TO STRANGERS', '04', 'paper', 'circle', 40),
    ('talking-to-strangers', 'share-something-small', 'Share Something Small', $$Tell a stranger one small, context-appropriate thing about yourself that gives them room to respond. Keep it brief and connected to the place, activity, or moment you already share.$$ , 'TALKING TO STRANGERS', '05', 'paper', 'circle', 50),
    ('talking-to-strangers', 'follow-your-curiosity', 'Follow Your Curiosity', $$Ask a stranger one respectful question about a visible, non-sensitive activity, item, or interest they have chosen to show or use in public. Ask because you are genuinely curious, not because you need an excuse to inspect their private life.$$ , 'TALKING TO STRANGERS', '06', 'paper', 'circle', 60),
    ('talking-to-strangers', 'say-what-you-noticed', 'Say What You Noticed', $$Tell a stranger you genuinely appreciate one specific, non-physical choice or considerate action you noticed. Say it once without asking for anything in return.$$ , 'TALKING TO STRANGERS', '07', 'paper', 'circle', 70),
    ('talking-to-strangers', 'introduce-yourself-first', 'Introduce Yourself First', $$In a setting where participants are welcome to meet each other, introduce yourself to one stranger before anyone introduces you. You do not need to make a friend or keep the conversation going.$$ , 'TALKING TO STRANGERS', '08', 'paper', 'circle', 80),
    ('talking-to-strangers', 'no-practical-excuse', 'No Practical Excuse', $$In an open setting where light interaction is welcome, start a brief interaction with a stranger when you do not need information, help, or a service—and nothing specific has just happened to create the opening for you. Choose someone who is not working and is not required to respond. Say something that gives them an easy chance to reply, then let them decide whether to continue.$$ , 'TALKING TO STRANGERS', '09', 'paper', 'circle', 90),
    ('talking-to-strangers', 'take-the-opening', 'Take the Opening', $$The next time you notice a safe, natural chance to speak to a stranger and feel yourself delaying, use a simple opening before the shared moment ends. The first sentence does not need to be clever or perfect.$$ , 'TALKING TO STRANGERS', '10', 'paper', 'circle', 100),
    ('talking-to-strangers', 'dont-hand-it-off', 'Don’t Hand It Off', $$While you are with someone you know, be the one to start one natural, appropriate interaction with a stranger instead of waiting for your companion to do it. Choose a moment that would reasonably happen during the time you are already spending together.$$ , 'TALKING TO STRANGERS', '11', 'paper', 'circle', 110),
    ('talking-to-strangers', 'open-in-the-open', 'Open in the Open', $$Start one appropriate, one-to-one interaction with a stranger while other people are nearby. Use your normal speaking voice. Do not whisper to hide the attempt, and do not perform for the people around you.$$ , 'TALKING TO STRANGERS', '12', 'paper', 'circle', 120),
    ('talking-to-strangers', 'walk-over-and-begin', 'Walk Over and Begin', $$In an open setting where brief interaction is appropriate, approach a stranger who is not already beside you and start one respectful interaction. Move into a normal speaking distance from a direction where they can naturally see you.$$ , 'TALKING TO STRANGERS', '13', 'paper', 'circle', 130),
    ('talking-to-strangers', 'break-the-familiar-silence', 'Break the Familiar Silence', $$Start a brief interaction with a familiar stranger—someone you recognize from a repeated shared setting but have never spoken to. Use the shared place, routine, or activity as the context. Do not ask for personal information.$$ , 'TALKING TO STRANGERS', '14', 'paper', 'circle', 140),
    ('talking-to-strangers', 'ask-about-what-matters', 'Ask About What Matters', $$Start an interaction with a stranger around a subject you genuinely care about, and ask one question you actually want answered. Choose someone whose connection to the subject is visible from the shared setting, activity, or interest—not from private assumptions about them.$$ , 'TALKING TO STRANGERS', '15', 'paper', 'circle', 150)
) as mission(
  pack_slug, slug, title, note, tag, code, theme_key, artwork_key, sort_order
)
on mission.pack_slug = pack.slug
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
