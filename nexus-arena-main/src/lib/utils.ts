import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Smoothly scrolls the window to bring the target element into view,
 * ensuring users automatically see active layout changes (e.g. preview canvas, editing forms).
 */
export function scrollToFocus(
  elementOrId: HTMLElement | string | null | undefined,
  offset = 100
) {
  if (typeof window === "undefined" || !elementOrId) return;

  const target =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

  if (!target) return;

  const elementPosition = target.getBoundingClientRect().top + window.scrollY;
  const offsetPosition = Math.max(0, elementPosition - offset);

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}
