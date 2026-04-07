import { useEffect, useState } from 'react';

export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
      }
      return JSON.parse(raw);
    } catch {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota / privacy mode errors
    }
  }, [key, value]);

  return [value, setValue];
}


