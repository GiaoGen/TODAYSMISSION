import type { StaticImageData } from "next/image";

import doingCover from "@/docs/design/packs/doing-things-alone/packcover/pack-cover.png";
import doingStayAwhile from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/01 - Stay Awhile.png";
import doingEatOutside from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/02 - Eat Outside Alone.png";
import doingBrowseAlone from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/04 - Browse Alone.png";
import doingGoSomewhere from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/05 - Go Somewhere New.png";
import doingCoffee from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/07 - Coffee for One.png";
import doingMovie from "@/docs/design/packs/doing-things-alone/final-numbered-mission-artwork/09 - Movie for One.png";
import rejectionCover from "@/docs/design/packs/fear-of-rejection/packcover/00-pack-cover.png";
import rejectionSmallAsk from "@/docs/design/packs/fear-of-rejection/final-pack/01-one-small-ask.png";
import rejectionPreference from "@/docs/design/packs/fear-of-rejection/final-pack/02-put-your-preference-on-the-table.png";
import rejectionBeforeStuck from "@/docs/design/packs/fear-of-rejection/final-pack/03-ask-before-you-are-stuck.png";
import rejectionInvitation from "@/docs/design/packs/fear-of-rejection/final-pack/04-make-the-invitation.png";
import rejectionJoin from "@/docs/design/packs/fear-of-rejection/final-pack/05-ask-to-join.png";
import rejectionIdea from "@/docs/design/packs/fear-of-rejection/final-pack/06-put-your-idea-forward.png";
import strangersCover from "@/docs/design/packs/talking-to-strangers/packcover/00-pack-cover-talking-to-strangers.png";
import strangersHello from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/01-hello-first-repaired.png";
import strangersAsk from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/02-ask-something-real-repaired.png";
import strangersTake from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/03-ask-for-their-take-repaired.png";
import strangersMoment from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/04-name-the-moment-repaired.png";
import strangersShare from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/05-share-something-small.png";
import strangersCuriosity from "@/docs/design/packs/talking-to-strangers/talking_to_trangers_mission_artwork/06-follow-your-curiosity.png";

export type ExploreMissionArtwork = {
  id: string;
  title: string;
  artwork: StaticImageData;
};

export type ExplorePackSummary = {
  slug: string;
  title: string;
  cover: StaticImageData;
  background: string;
  foreground: string;
};

export type ExplorePackPreviewData = ExplorePackSummary & {
  missions: readonly ExploreMissionArtwork[];
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
      { id: "browse-alone", title: "Browse Alone", artwork: doingBrowseAlone },
      { id: "go-somewhere-new", title: "Go Somewhere New", artwork: doingGoSomewhere },
      { id: "coffee-for-one", title: "Coffee for One", artwork: doingCoffee },
      { id: "movie-for-one", title: "Movie for One", artwork: doingMovie },
    ],
  },
  {
    slug: "fear-of-rejection",
    title: "Fear of Rejection",
    cover: rejectionCover,
    background: "#E7E8E5",
    foreground: "#4A4542",
    missions: [
      { id: "one-small-ask", title: "One Small Ask", artwork: rejectionSmallAsk },
      { id: "put-your-preference-on-the-table", title: "Put Your Preference on the Table", artwork: rejectionPreference },
      { id: "ask-before-you-are-stuck", title: "Ask Before You Are Stuck", artwork: rejectionBeforeStuck },
      { id: "make-the-invitation", title: "Make the Invitation", artwork: rejectionInvitation },
      { id: "ask-to-join", title: "Ask to Join", artwork: rejectionJoin },
      { id: "put-your-idea-forward", title: "Put Your Idea Forward", artwork: rejectionIdea },
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
