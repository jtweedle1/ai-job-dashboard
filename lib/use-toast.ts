"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SHOW_MS = 3000;
const ERROR_MS = 5000;
// Long enough to notice a slip and take it back.
export const UNDO_MS = 6000;

interface Undoable {
  // Puts things back the way they were.
  undo: () => void;
  // Makes the change for real. Runs when the toast goes away without Undo being pressed,
  // when another toast replaces it, or when the page goes away.
  commit: () => void;
}

interface ToastState {
  message: string;
  tone?: "done" | "error";
  undoable: boolean;
}

// The confirmation pill, with an optional Undo that holds back a change (such as a delete) until it expires.
// Spread `toastProps` onto <Toast />.
export function useToast() {
  const [state, setState] = useState<ToastState>({ message: "", undoable: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Undoable | null>(null);

  const settle = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    p?.commit();
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    settle();
    setState({ message: "", undoable: false });
  }, [settle]);

  const hideIn = useCallback(
    (ms: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, ms);
    },
    [hide]
  );

  const show = useCallback(
    (message: string, opts: { tone?: ToastState["tone"] } & Partial<Undoable> = {}) => {
      settle();
      pending.current = opts.undo && opts.commit ? { undo: opts.undo, commit: opts.commit } : null;
      setState({ message, tone: opts.tone, undoable: pending.current != null });
      hideIn(pending.current ? UNDO_MS : opts.tone === "error" ? ERROR_MS : SHOW_MS);
    },
    [settle, hideIn]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      settle();
    },
    [settle]
  );

  const undo = useCallback(() => {
    const p = pending.current;
    pending.current = null;
    if (timer.current) clearTimeout(timer.current);
    setState({ message: "", undoable: false });
    p?.undo();
  }, []);

  return {
    show,
    toastProps: {
      message: state.message,
      tone: state.tone,
      action: state.undoable ? { label: "Undo", onClick: undo } : undefined,
      onHold: () => timer.current && clearTimeout(timer.current),
      onRelease: () => hideIn(SHOW_MS),
    },
  };
}
