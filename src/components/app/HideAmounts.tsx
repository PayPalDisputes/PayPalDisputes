"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "sira:hide-amounts";
const EVENT = "sira:hide-amounts";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Blurs every money figure marked `.money` (handy when sharing a screen or recording a demo).
 * Remembered per browser; the page reads fine without it.
 */
export function HideAmounts() {
  const hidden = useSyncExternalStore(subscribe, read, () => false);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-hide-amounts", hidden);
  }, [hidden]);

  const toggle = () => {
    try {
      localStorage.setItem(KEY, hidden ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
      className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-fg-body transition-colors hover:bg-inset hover:text-fg"
    >
      {hidden ? <EyeOff strokeWidth={1.6} className="size-[17px]" /> : <Eye strokeWidth={1.6} className="size-[17px]" />}
    </button>
  );
}
