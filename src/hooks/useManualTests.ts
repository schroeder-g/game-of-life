import { useState, useCallback, useEffect } from "react";
import { ManualTestResult, ManualTestStatus } from "../types/testing";

const STORAGE_KEY = "manual-tests-statuses";

function loadTestStatuses(): Map<string, ManualTestResult> {
  if (typeof window === "undefined") {
    return new Map();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration from very old format (array of strings)
      if (Array.isArray(parsed)) {
        const newMap = new Map<string, ManualTestResult>();
        parsed.forEach(id => newMap.set(id, { status: 'checked', timestamp: undefined }));
        return newMap;
      }

      // Migration from string status to object { status, timestamp }
      const newMap = new Map<string, ManualTestResult>();
      for (const key in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          const value = parsed[key];
          if (typeof value === "string") {
            newMap.set(key, { status: value as ManualTestStatus, timestamp: undefined });
          } else if (typeof value === "object" && value !== null && 'status' in value) {
            newMap.set(key, value as ManualTestResult);
          }
        }
      }
      return newMap;
    }
  } catch (error) {
    console.error("Failed to load manual test statuses:", error);
  }
  return new Map();
}

function saveTestStatuses(statuses: Map<string, ManualTestResult>) {
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
  const [testStatuses, setTestStatuses] = useState<Map<string, ManualTestResult>>(new Map());

  // Load initial state from localStorage on mount
  useEffect(() => {
    setTestStatuses(loadTestStatuses());
  }, []);

  const cycleTestStatus = useCallback((testId: string) => {
    setTestStatuses((prev) => {
      const newMap = new Map(prev);
      const currentResult = newMap.get(testId);
      const currentStatus = currentResult?.status;

      let nextStatus: ManualTestStatus;
      if (currentStatus === 'checked') {
        nextStatus = 'failed';
      } else if (currentStatus === 'failed') {
        nextStatus = undefined;
      } else { // currentStatus is undefined
        nextStatus = 'checked';
      }

      if (nextStatus) {
        newMap.set(testId, { status: nextStatus, timestamp: Date.now() });
      } else {
        newMap.delete(testId);
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
