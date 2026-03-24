import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "manual-tests-checked";

function loadCheckedTests(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch (error) {
    console.error("Failed to load checked manual tests:", error);
  }
  return new Set();
}

function saveCheckedTests(checkedIds: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checkedIds)));
  } catch (error) {
    console.error("Failed to save checked manual tests:", error);
  }
}

export function useManualTests() {
  const [checkedTests, setCheckedTests] = useState<Set<string>>(new Set());

  // Load initial state from localStorage on mount
  useEffect(() => {
    setCheckedTests(loadCheckedTests());
  }, []);

  const toggleTest = useCallback((testId: string) => {
    setCheckedTests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      saveCheckedTests(newSet);
      return newSet;
    });
  }, []);

  return {
    checkedTests,
    toggleTest,
  };
}
