import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 대화상자가 열려 있는 동안 Tab 초점을 가두고, 닫히면 원래 있던 곳으로 초점을 돌려준다. */
export function useModalFocus() {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'));
    const current = () => dialogs()[dialogs().length - 1];

    const dialog = current();
    if (dialog && !dialog.contains(document.activeElement)) {
      (dialog.querySelector<HTMLElement>("[autofocus], input, textarea") ?? dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus({ preventScroll: true });
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = current();
      if (!root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);
}
