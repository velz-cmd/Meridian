"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACTIVITY_EVENT,
  appendMeridianActivity,
  readMeridianActivityLog,
  seedMeridianActivityIfEmpty,
  type MeridianActivityEntry,
} from "@/lib/meridian-activity-log";

export function useMeridianActivityLog() {
  const [entries, setEntries] = useState<MeridianActivityEntry[]>([]);

  const refresh = useCallback(() => {
    setEntries(readMeridianActivityLog());
  }, []);

  useEffect(() => {
    seedMeridianActivityIfEmpty();
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(ACTIVITY_EVENT, onUpdate);
    return () => window.removeEventListener(ACTIVITY_EVENT, onUpdate);
  }, [refresh]);

  return { entries, refresh, append: appendMeridianActivity };
}
