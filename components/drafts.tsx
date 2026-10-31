'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
  type Dispatch,
} from 'react';
const Scope = createContext('guest');
const Files = createContext<Map<string, File> | null>(null);
const prefix = 'shangan:draft:';
const maxAge = 24 * 60 * 60 * 1000;
export function DraftProvider({ scope, children }: { scope: string; children: React.ReactNode }) {
  const files = useRef(new Map<string, File>());
  useEffect(() => {
    try {
      const old = sessionStorage.getItem('shangan:draft-scope');
      if (old && old !== scope) {
        clearSessionDrafts();
        files.current.clear();
      }
      sessionStorage.setItem('shangan:draft-scope', scope);
    } catch {
      /* storage can be disabled; server saves still work */
    }
  }, [scope]);
  useEffect(() => {
    const clear = () => files.current.clear();
    window.addEventListener('shangan-clear-drafts', clear);
    return () => window.removeEventListener('shangan-clear-drafts', clear);
  }, []);
  return (
    <Scope.Provider value={scope}>
      <Files.Provider value={files.current}>{children}</Files.Provider>
    </Scope.Provider>
  );
}
export function clearSessionDrafts() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('shangan-clear-drafts'));
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith(prefix)) sessionStorage.removeItem(key);
  } catch {
    /* no persistent browser storage */
  }
}
export function useFileDraft(name: string): [File | null, (file: File | null) => void] {
  const files = useContext(Files),
    scope = useContext(Scope),
    key = `${scope}:${name}`;
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    setFile(files?.get(key) || null);
  }, [key, files]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (file) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [file]);
  return [
    file,
    (next) => {
      if (next) files?.set(key, next);
      else files?.delete(key);
      setFile(next);
    },
  ];
}
export function useDraftStorage<T>(name: string) {
  const scope = useContext(Scope),
    key = `${prefix}${scope}:${name}`;
  const keyRef = useRef(key);
  keyRef.current = key;
  return {
    read(): T | null {
      try {
        const raw = sessionStorage.getItem(keyRef.current);
        if (!raw) return null;
        const saved = JSON.parse(raw);
        if (saved.scope === scope && Number(saved.time) > Date.now() - maxAge)
          return saved.value as T;
        sessionStorage.removeItem(keyRef.current);
      } catch {
        /* invalid or unavailable storage */
      }
      return null;
    },
    write(value: T) {
      try {
        sessionStorage.setItem(keyRef.current, JSON.stringify({ scope, time: Date.now(), value }));
      } catch {
        /* manual save remains available */
      }
    },
    clear() {
      try {
        sessionStorage.removeItem(keyRef.current);
      } catch {
        /* unavailable */
      }
    },
  };
}
export function useDraftState<T>(
  name: string,
  initial: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const storage = useDraftStorage<T>(name);
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const restored = storage.read();
    if (restored !== null) setValue(restored);
  }, [name]);
  const set: Dispatch<SetStateAction<T>> = (next) =>
    setValue((old) => {
      const resolved = typeof next === 'function' ? (next as (old: T) => T)(old) : next;
      storage.write(resolved);
      return resolved;
    });
  return [value, set, () => storage.clear()];
}
