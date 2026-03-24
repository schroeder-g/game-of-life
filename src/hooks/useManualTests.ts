import { useState, useCallback, useEffect } from "react";
import { ManualTestStatus } from "../types/testing";

const STORAGE_KEY = "manual-tests-statuses";

function loadTestStatuses(): Map<string, ManualTestStatus> {
  if (typeof window === "undefined") {
    return new Map();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration from old format (array of strings)
      if (Array.isArray(parsed)) {
        const newMap = new Map<string, ManualTestStatus>();
        parsed.forEach(id => newMap.set(id, 'checked'));
        return newMap;
      }
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Failed to load manual test statuses:", error);
  }
  return new Map();
}

function saveTestStatuses(statuses: Map<string, ManualTestStatus>) {
  if (typeof window === "undefined") return;
  try {
    const obj = Object.fromEntries(statuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    // Also clean up old storage key if it exists
    if (localStorage.getItem("manual-tests-checked")) {
      localStorage.removeItem("manual-tests-checked");
    }
  } catch (error) {
    console.error("Failed to save manual test statuses:", error);
  }
}

export function useManualTests() {
  const [testStatuses, setTestStatuses] = useState<Map<string, ManualTestStatus>>(new Map());

  // Load initial state from localStorage on mount
  useEffect(() => {
    setTestStatuses(loadTestStatuses());
  }, []);

  const cycleTestStatus = useCallback((testId: string) => {
    setTestStatuses((prev) => {
      const newMap = new Map(prev);
      const currentStatus = newMap.get(testId);

      if (currentStatus === 'checked') {
        newMap.set(testId, 'failed');
      } else if (currentStatus === 'failed') {
        newMap.delete(testId);
      } else { // currentStatus is undefined
        newMap.set(testId, 'checked');
      }

      saveTestStatuses(newMap);
      return newMap;
    });
  }, []);

  return {
    testStatuses,
    cycleTestStatus,
  };
}
