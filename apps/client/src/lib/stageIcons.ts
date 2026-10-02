import type { Stage } from "@job-tracker/shared";
import { Bookmark, CircleCheck, CircleX, Search, Send, Trophy, Undo2, Users, type LucideIcon } from "lucide-react";

/** One icon per stage, used beside the stage's name (spec 011, AC-1). */
export const STAGE_ICONS: Record<Stage, LucideIcon> = {
  wishlist: Bookmark,
  applied: Send,
  screening: Search,
  interviewing: Users,
  offer: CircleCheck,
  accepted: Trophy,
  rejected: CircleX,
  withdrawn: Undo2,
};
