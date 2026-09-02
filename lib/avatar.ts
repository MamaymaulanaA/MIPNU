import { createAvatar } from "@dicebear/core";
import { personas } from "@dicebear/collection";

export type StoredGender = "L" | "P" | null | undefined;

const BACKGROUND = ["eef4ff", "c9d8ff", "ffffff"] as const;

const CLOTHING = ["1f356b", "255ed3", "2f6fed", "667085", "c9d8ff"] as const;

const HAIR_COLOR = ["362c47", "6c4545", "dee1f5"] as const;

const HAIR_MASCULINE = [
  "sideShave",
  "shortCombover",
  "curlyHighTop",
  "buzzcut",
  "bald",
  "fade",
  "shortComboverChops",
] as const;

const HAIR_FEMININE = [
  "long",
  "bobCut",
  "curly",
  "bobBangs",
  "extraLong",
] as const;

const HAIR_NEUTRAL = [
  "long",
  "bobCut",
  "curly",
  "shortCombover",
  "curlyHighTop",
  "buzzcut",
  "fade",
] as const;

const FACIAL_HAIR = ["beardMustache", "goatee", "shadow", "soulPatch"] as const;

const MOUTH = ["smile", "bigSmile", "smirk"] as const;

const EYES = ["open", "happy", "glasses"] as const;

type Presentation = "L" | "P" | "N";

function options(presentation: Presentation) {
  const hair =
    presentation === "L"
      ? HAIR_MASCULINE
      : presentation === "P"
        ? HAIR_FEMININE
        : HAIR_NEUTRAL;

  return {
    backgroundColor: [...BACKGROUND],
    clothingColor: [...CLOTHING],
    hairColor: [...HAIR_COLOR],
    hair: [...hair],
    mouth: [...MOUTH],
    eyes: [...EYES],
    facialHair: [...FACIAL_HAIR],
    facialHairProbability: presentation === "L" ? 35 : 0,
  };
}

const cache = new Map<string, string>();
const CACHE_LIMIT = 512;

function generate(presentation: Presentation, seed: string): string {
  const key = `${presentation}:${seed}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const uri = createAvatar(personas, {
    seed,
    ...options(presentation),
  }).toDataUri();

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, uri);

  return uri;
}

export type AvatarInput = {
  customUrl?: string | null;
  gender?: StoredGender;
  identity?: string | null;
};

export type AvatarPresentation = {
  src: string;
  isCustom: boolean;
};

export function getAvatarPresentation({
  customUrl,
  gender,
  identity,
}: AvatarInput): AvatarPresentation {
  if (customUrl) return { src: customUrl, isCustom: true };

  const presentation: Presentation =
    gender === "L" ? "L" : gender === "P" ? "P" : "N";

  return { src: generate(presentation, identity ?? "mipnu"), isCustom: false };
}
