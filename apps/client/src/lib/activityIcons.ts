import type { ActivityType } from "@job-tracker/shared";
import { ArrowRight, CalendarClock, Mail, Phone, StickyNote, type LucideIcon } from "lucide-react";

/** One icon per kind of timeline entry, shown in the round mark beside it. A stage change is an arrow (spec 016, AC-8). */
export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  note: StickyNote,
  email: Mail,
  call: Phone,
  interview: CalendarClock,
  stage_change: ArrowRight,
};
