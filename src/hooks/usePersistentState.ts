import { useState, useEffect, useRef } from 'react';

/**
 * A custom hook that persists state to localStorage.
 * 
 * @param key The localStorage key to use
 * @param defaultValue The initial value (or a function that returns it)
 * @returns [state, setState]
 */
export function usePersistentState<T>(key: string, defaultValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initial state retrieval
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
    }

    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue !== null) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }

    // If no stored value or error, use defaultValue
    return typeof defaultValue === 'function' ? (defaultValue as () => T)() : defaultValue;
  });

  // Keep track of the current key to handle dynamic key changes (though rare for this use case)
  const prevKeyRef = useRef(key);

  useEffect(() => {
    // If the key changes, we don't necessarily want to wipe the state, 
    // but the effect should re-sync with the new key.
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error saving to localStorage key "${key}":`, error);
    }
    prevKeyRef.current = key;
  }, [key, state]);

  return [state, setState];
}
