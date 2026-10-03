import { STAGES } from "@job-tracker/shared";
import { BOARD_STAGES_KEY } from "../../src/lib/useBoardStages.ts";

/** Makes the board show every column, as before spec 018 hid the closed ones to start. */
export function showAllStages(): void {
  window.localStorage.setItem(BOARD_STAGES_KEY, JSON.stringify(STAGES));
}
