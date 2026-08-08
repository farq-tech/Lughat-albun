import type { StaffLocale, StaffMessages } from "../types";
import { ar } from "./ar";
import { bn } from "./bn";
import { en } from "./en";
import { hi } from "./hi";

export const MESSAGES: Record<StaffLocale, StaffMessages> = {
  en,
  hi,
  bn,
  ar,
};
