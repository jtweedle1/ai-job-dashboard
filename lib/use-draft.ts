"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/lib/drafts";

// Like useState, but the value survives a step switch, a reload or a wandering-off, until it's saved.
// `isEmpty` decides when there's nothing worth keeping; `clear` drops the draft once the real save worked.
export function useDraft<T>(name: string, initial: T, isEmpty: (v: T) => boolean) {
  const { user } = useAuth();
  const key = user ? draftKey(user.uid, name) : null;
  const [saved] = useState<T | null>(() => (key ? readDraft<T>(key) : null));
  const [value, setValue] = useState<T>(saved ?? initial);
  // True when this mount picked up a draft left from before, so the UI can say so.
  const [restored, setRestored] = useState(saved != null);
  const emptyRef = useRef(isEmpty);
  useEffect(() => {
    emptyRef.current = isEmpty;
  });

  useEffect(() => {
    if (!key) return;
    if (emptyRef.current(value)) clearDraft(key);
    else writeDraft(key, value);
  }, [key, value]);

  const clear = useCallback(() => {
    if (key) clearDraft(key);
    setRestored(false);
    setValue(initial);
    // `initial` is a fresh literal each render; the first one is the one that counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, setValue, clear, restored };
}
