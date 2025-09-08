"use client";

import { useState } from "react";

export function useLocalState<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      }
      // No existing value, compute initial value and store it
      const computedInitialValue =
        typeof initialValue === "function"
          ? (initialValue as () => T)()
          : initialValue;
      window.localStorage.setItem(key, JSON.stringify(computedInitialValue));
      return computedInitialValue;
    } catch {
      // Error reading/writing localStorage, using initial value
      return typeof initialValue === "function"
        ? (initialValue as () => T)()
        : initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch {
      // Error setting localStorage
    }
  };

  return [storedValue, setValue];
}
