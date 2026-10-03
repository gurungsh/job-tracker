import { STAGES, type Stage, isClosedStage } from "@job-tracker/shared";
import { useCallback, useState } from "react";

/** The browser setting that holds the stages the board shows (spec 018, AC-5). */
export const BOARD_STAGES_KEY = "job-tracker-stages";

/** What the board shows until I choose otherwise: every stage but the closed ones (spec 018, AC-1). */
export const DEFAULT_BOARD_STAGES: readonly Stage[] = STAGES.filter((stage) => !isClosedStage(stage));

/** The saved stages in board order, or the default when there are none, they aren't valid, or storage is blocked (AC-6). */
export function readBoardStages(): readonly Stage[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(BOARD_STAGES_KEY) ?? "null");
    if (!Array.isArray(parsed)) return DEFAULT_BOARD_STAGES;
    const chosen = STAGES.filter((stage) => parsed.includes(stage));
    return chosen.length > 0 ? chosen : DEFAULT_BOARD_STAGES;
  } catch {
    return DEFAULT_BOARD_STAGES;
  }
}

function storeBoardStages(stages: readonly Stage[]): void {
  try {
    window.localStorage.setItem(BOARD_STAGES_KEY, JSON.stringify(stages));
  } catch {
    // Storage is blocked. The choice lasts until the page is reloaded (AC-6).
  }
}

/** The stages the board shows, and a setter that saves them and never leaves the board with none (AC-4, AC-5). */
export function useBoardStages(): [readonly Stage[], (stages: readonly Stage[]) => void] {
  const [stages, setStages] = useState(readBoardStages);
  const choose = useCallback((next: readonly Stage[]) => {
    if (next.length === 0) return;
    const ordered = STAGES.filter((stage) => next.includes(stage));
    setStages(ordered);
    storeBoardStages(ordered);
  }, []);
  return [stages, choose];
}
