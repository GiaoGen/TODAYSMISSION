import type { StaticImageData } from "next/image";

import doingCover from "@/docs/design/packs/doing-things-alone/packcover/pack-cover.png";
import doingStayAwhile from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/01 - Stay Awhile.png";
import doingEatOutside from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/02 - Eat Outside Alone.png";
import doingBrowseAlone from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/04 - Browse Alone.png";
import doingGoSomewhere from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/05 - Go Somewhere New.png";
import doingCoffee from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/07 - Coffee for One.png";
import doingMovie from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/09 - Movie for One.png";
import rejectionCover from "@/docs/design/packs/fear-of-rejection/packcover/00-pack-cover.png";
import rejectionArtwork01 from "@/docs/design/packs/fear-of-rejection/final-pack/01-one-small-ask.png";
import rejectionArtwork02 from "@/docs/design/packs/fear-of-rejection/final-pack/02-put-your-preference-on-the-table.png";
import rejectionArtwork03 from "@/docs/design/packs/fear-of-rejection/final-pack/03-ask-before-you-are-stuck.png";
import rejectionArtwork04 from "@/docs/design/packs/fear-of-rejection/final-pack/04-make-the-invitation.png";
import rejectionArtwork05 from "@/docs/design/packs/fear-of-rejection/final-pack/05-ask-to-join.png";
import rejectionArtwork06 from "@/docs/design/packs/fear-of-rejection/final-pack/06-put-your-idea-forward.png";
import rejectionArtwork07 from "@/docs/design/packs/fear-of-rejection/final-pack/07-ask-for-their-time.png";
import rejectionArtwork08 from "@/docs/design/packs/fear-of-rejection/final-pack/08-request-a-fair-adjustment.png";
import rejectionArtwork09 from "@/docs/design/packs/fear-of-rejection/final-pack/09-ask-upward.png";
import rejectionArtwork10 from "@/docs/design/packs/fear-of-rejection/final-pack/10-let-the-ask-stand.png";
import rejectionArtwork11 from "@/docs/design/packs/fear-of-rejection/final-pack/11-follow-up-once.png";
import rejectionArtwork12 from "@/docs/design/packs/fear-of-rejection/final-pack/12-put-yourself-forward.png";
import rejectionArtwork13 from "@/docs/design/packs/fear-of-rejection/final-pack/13-ask-for-real-support.png";
import sheepPeek from "@/docs/design/mission-card-character-templates/sheep/concepts/01-peek-from-right.png";
import sheepRun from "@/docs/design/mission-card-character-templates/sheep/concepts/02-balance-run-single.png";
import sheepPair from "@/docs/design/mission-card-character-templates/sheep/concepts/03-comforting-pair.png";
import sheepSurprise from "@/docs/design/mission-card-character-templates/sheep/concepts/04-surprised-single.png";
import strangersCover from "@/docs/design/packs/talking-to-strangers/packcover/00-pack-cover-talking-to-strangers.png";
import strangersHello from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/01-hello-first-repaired.png";
import strangersAsk from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/02-ask-something-real-repaired.png";
import strangersTake from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/03-ask-for-their-take-repaired.png";
import strangersMoment from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/04-name-the-moment-repaired.png";
import strangersShare from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/05-share-something-small.png";
import strangersCuriosity from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/06-follow-your-curiosity.png";
import strangersNotice from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/07-say-what-you-noticed.png";
import strangersIntroduce from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/08-introduce-yourself-first.png";
import strangersNoExcuse from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/09-no-practical-excuse.png";
import strangersOpening from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/10-take-the-opening.png";
import strangersDontHandOff from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/11-dont-hand-it-off.png";
import strangersOpen from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/12-open-in-the-open.png";
import strangersWalkOver from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/13-walk-over-and-begin.png";
import strangersFamiliarSilence from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/14-break-the-familiar-silence.png";
import strangersWhatMatters from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/15-ask-about-what-matters.png";

export type ExploreMissionArtwork = {
  id: string;
  title: string;
  artwork: StaticImageData | string;
  previewArtwork?: StaticImageData | string;
  card?: {
    background: string;
    description: string;
    foreground: string;
    titleLines: readonly string[];
    titleSize: string;
    titleWidth: string;
  };
};

export type ExplorePackSummary = {
  /** The database Pack UUID. Static preview data does not have this value. */
  id?: string;
  slug: string;
  title: string;
  cover: StaticImageData;
  background: string;
  foreground: string;
  joined?: boolean;
};

export type ExplorePackPreviewData = ExplorePackSummary & {
  missions: readonly ExploreMissionArtwork[];
};

export type ExplorePackDetailData = Omit<ExplorePackPreviewData, "id" | "joined"> & {
  id: string;
  joined: boolean;
  authenticated: boolean;
  activeMissionId: string | null;
  completedMissionIds: readonly string[];
};

export const EXPLORE_PACKS = [
  {
    slug: "doing-things-alone",
    title: "Doing Things Alone",
    cover: doingCover,
    background: "#9CC9EA",
    foreground: "#273B4D",
    missions: [
      { id: "stay-awhile", title: "Stay Awhile", artwork: doingStayAwhile },
      { id: "eat-outside-alone", title: "Eat Outside Alone", artwork: doingEatOutside },
      { id: "lunch-for-one", title: "Lunch for One", artwork: "/packs/doing-things-alone/missions/lunch-for-one.webp" },
      { id: "browse-alone", title: "Browse Alone", artwork: doingBrowseAlone },
      { id: "go-somewhere-new", title: "Go Somewhere New", artwork: doingGoSomewhere },
      { id: "sit-in-the-crowd", title: "Sit in the Crowd", artwork: "/packs/doing-things-alone/missions/sit-in-the-crowd.webp" },
      { id: "coffee-for-one", title: "Coffee for One", artwork: doingCoffee },
      { id: "table-for-one", title: "Table for One", artwork: "/packs/doing-things-alone/missions/table-for-one.webp" },
      { id: "movie-for-one", title: "Movie for One", artwork: doingMovie },
      { id: "see-it-for-yourself", title: "See It for Yourself", artwork: "/packs/doing-things-alone/missions/see-it-for-yourself.webp" },
      { id: "play-alone", title: "Play Alone", artwork: "/packs/doing-things-alone/missions/play-alone.webp" },
      { id: "go-to-something", title: "Go to Something", artwork: "/packs/doing-things-alone/missions/go-to-something.webp" },
      { id: "show-up-alone", title: "Show Up Alone", artwork: "/packs/doing-things-alone/missions/show-up-alone.webp" },
      { id: "be-the-only-one", title: "Be the Only One", artwork: "/packs/doing-things-alone/missions/be-the-only-one.webp" },
      { id: "one-hour-out", title: "One Hour Out", artwork: "/packs/doing-things-alone/missions/one-hour-out.webp" },
      { id: "spend-the-day-your-way", title: "Spend the Day Your Way", artwork: "/packs/doing-things-alone/missions/spend-the-day-your-way.webp" },
    ],
  },
  {
    slug: "fear-of-rejection",
    title: "Fear of Rejection",
    cover: rejectionCover,
    background: "#E7E8E5",
    foreground: "#4A4542",
    missions: [
      {
        id: "one-small-ask",
        title: "One Small Ask",
        artwork: sheepPeek,
        previewArtwork: rejectionArtwork01,
        card: { background: "#D98D86", description: "Ask an appropriate person for one small, specific, optional thing that would genuinely make your day easier. Make it easy for them to answer yes or no.", foreground: "#352B3B", titleLines: ["One", "Small", "Ask"], titleSize: "15.7cqw", titleWidth: "58cqw" },
      },
      {
        id: "put-your-preference-on-the-table",
        title: "Put Your Preference on the Table",
        artwork: sheepRun,
        previewArtwork: rejectionArtwork02,
        card: { background: "#DFBD61", description: "During a real shared choice, state the option you genuinely prefer and ask whether the other person or group is willing to choose it.", foreground: "#263A34", titleLines: ["Put Your", "Preference", "On the", "Table"], titleSize: "11.8cqw", titleWidth: "87cqw" },
      },
      {
        id: "ask-before-you-are-stuck",
        title: "Ask Before You Are Stuck",
        artwork: sheepPair,
        previewArtwork: rejectionArtwork03,
        card: { background: "#78A5BD", description: "Ask a person reasonably placed to help for one bounded piece of guidance on something you are genuinely trying to do—before delay or confusion becomes a crisis.", foreground: "#182D43", titleLines: ["Ask Before", "You Are", "Stuck"], titleSize: "13.5cqw", titleWidth: "82cqw" },
      },
      {
        id: "make-the-invitation",
        title: "Make the Invitation",
        artwork: sheepSurprise,
        previewArtwork: rejectionArtwork04,
        card: { background: "#91B58A", description: "Invite someone you already know or naturally share context with to one specific, low-pressure activity you would genuinely like to do together. Include enough detail for them to answer. One invitation is enough.", foreground: "#28372F", titleLines: ["Make the", "Invitation"], titleSize: "13.2cqw", titleWidth: "82cqw" },
      },
      {
        id: "ask-to-join",
        title: "Ask to Join",
        artwork: sheepRun,
        previewArtwork: rejectionArtwork05,
        card: { background: "#A99AC2", description: "Ask to join one appropriate activity, plan, or working session that is open enough for the people involved to realistically include you—or decline.", foreground: "#2D2940", titleLines: ["Ask to", "Join"], titleSize: "15cqw", titleWidth: "62cqw" },
      },
      {
        id: "put-your-idea-forward",
        title: "Put Your Idea Forward",
        artwork: sheepPair,
        previewArtwork: rejectionArtwork06,
        card: { background: "#E6A56F", description: "In a real shared decision, clearly ask a group to consider one idea you genuinely support. State the proposal briefly. Let the group evaluate it without turning the moment into a speech about your worth.", foreground: "#3F2D2A", titleLines: ["Put Your", "Idea", "Forward"], titleSize: "13cqw", titleWidth: "76cqw" },
      },
      {
        id: "ask-for-their-time",
        title: "Ask for Their Time",
        artwork: sheepSurprise,
        previewArtwork: rejectionArtwork07,
        card: { background: "#C9889D", description: "Ask someone relevant for a specific, bounded amount of time to discuss something that genuinely matters to you. Name the purpose and approximate time. Let them choose whether and when.", foreground: "#3C2635", titleLines: ["Ask for", "Their Time"], titleSize: "13.4cqw", titleWidth: "78cqw" },
      },
      {
        id: "request-a-fair-adjustment",
        title: "Request a Fair Adjustment",
        artwork: sheepPeek,
        previewArtwork: rejectionArtwork08,
        card: { background: "#86B8AC", description: "When a real arrangement, service, schedule, or shared process is not working reasonably for you, ask the appropriate person for one fair and specific adjustment.", foreground: "#1F3834", titleLines: ["Request a", "Fair", "Adjustment"], titleSize: "11.2cqw", titleWidth: "86cqw" },
      },
      {
        id: "ask-upward",
        title: "Ask Upward",
        artwork: sheepPair,
        previewArtwork: rejectionArtwork09,
        card: { background: "#889FC9", description: "Ask someone with legitimate authority in a setting you already belong to for one reasonable, discretionary thing that would genuinely help you. Choose a request they are actually allowed to consider, not something they are required to grant.", foreground: "#202C47", titleLines: ["Ask", "Upward"], titleSize: "15.2cqw", titleWidth: "68cqw" },
      },
      {
        id: "let-the-ask-stand",
        title: "Let the Ask Stand",
        artwork: sheepSurprise,
        previewArtwork: rejectionArtwork10,
        card: { background: "#C98263", description: "Make one appropriate request in a single clear sentence. Do not erase it inside the sentence with “it doesn't matter,” “forget it,” or an immediate retreat. Then pause and let the other person answer. Politeness is welcome. Self-cancellation is not required.", foreground: "#3A2825", titleLines: ["Let the Ask", "Stand"], titleSize: "13cqw", titleWidth: "83cqw" },
      },
      {
        id: "follow-up-once",
        title: "Follow Up Once",
        artwork: sheepPeek,
        previewArtwork: rejectionArtwork11,
        card: { background: "#B7C86E", description: "After a reasonable response window has passed on a legitimate request that still matters, send one brief, respectful follow-up and make it easy to decline. Then leave the decision with them.", foreground: "#2F3825", titleLines: ["Follow Up", "Once"], titleSize: "14cqw", titleWidth: "78cqw" },
      },
      {
        id: "put-yourself-forward",
        title: "Put Yourself Forward",
        artwork: sheepRun,
        previewArtwork: rejectionArtwork12,
        card: { background: "#B98FA8", description: "Ask to be considered for one real opportunity, role, contribution, or responsibility you genuinely want—even though selection is not guaranteed.", foreground: "#362737", titleLines: ["Put", "Yourself", "Forward"], titleSize: "13.2cqw", titleWidth: "76cqw" },
      },
      {
        id: "ask-for-real-support",
        title: "Ask for Real Support",
        artwork: sheepPeek,
        previewArtwork: rejectionArtwork13,
        card: { background: "#74B2B7", description: "Ask a trusted person for one specific form of support you genuinely need, and allow them to say what they can or cannot offer.", foreground: "#17383A", titleLines: ["Ask for", "Real", "Support"], titleSize: "13.2cqw", titleWidth: "72cqw" },
      },
    ],
  },
  {
    slug: "talking-to-strangers",
    title: "Talking to Strangers",
    cover: strangersCover,
    background: "#496B91",
    foreground: "#FFF2D8",
    missions: [
      { id: "hello-first", title: "Hello First", artwork: strangersHello },
      { id: "ask-something-real", title: "Ask Something Real", artwork: strangersAsk },
      { id: "ask-for-their-take", title: "Ask for Their Take", artwork: strangersTake },
      { id: "name-the-moment", title: "Name the Moment", artwork: strangersMoment },
      { id: "share-something-small", title: "Share Something Small", artwork: strangersShare },
      { id: "follow-your-curiosity", title: "Follow Your Curiosity", artwork: strangersCuriosity },
      { id: "say-what-you-noticed", title: "Say What You Noticed", artwork: strangersNotice },
      { id: "introduce-yourself-first", title: "Introduce Yourself First", artwork: strangersIntroduce },
      { id: "no-practical-excuse", title: "No Practical Excuse", artwork: strangersNoExcuse },
      { id: "take-the-opening", title: "Take the Opening", artwork: strangersOpening },
      { id: "dont-hand-it-off", title: "Don’t Hand It Off", artwork: strangersDontHandOff },
      { id: "open-in-the-open", title: "Open in the Open", artwork: strangersOpen },
      { id: "walk-over-and-begin", title: "Walk Over and Begin", artwork: strangersWalkOver },
      { id: "break-the-familiar-silence", title: "Break the Familiar Silence", artwork: strangersFamiliarSilence },
      { id: "ask-about-what-matters", title: "Ask About What Matters", artwork: strangersWhatMatters },
    ],
  },
] as const satisfies readonly ExplorePackPreviewData[];

export const EXPLORE_PACK_SUMMARIES: readonly ExplorePackSummary[] = EXPLORE_PACKS.map((pack) => ({
  slug: pack.slug,
  title: pack.title,
  cover: pack.cover,
  background: pack.background,
  foreground: pack.foreground,
}));

export function getExplorePackPreview(slug: string): ExplorePackPreviewData | null {
  return EXPLORE_PACKS.find((pack) => pack.slug === slug) ?? null;
}
