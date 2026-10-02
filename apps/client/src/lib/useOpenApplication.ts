import type { Application } from "@job-tracker/shared";
import { useLocation, useNavigate } from "react-router";
import { originState } from "./viewOrigin.ts";

/** Opens an application's page, remembering the view it was opened from so the page can go back to it (spec 013, AC-1, AC-8). */
export function useOpenApplication(): (application: Application) => void {
  const navigate = useNavigate();
  const location = useLocation();
  return (application) => {
    void navigate(`/applications/${String(application.id)}`, { state: originState(location) });
  };
}
