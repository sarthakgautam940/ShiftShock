
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/**
 * The one placement engine for everything that hangs off a trigger.
 *
 * Select, Menu and Combobox all need the same four things: measure the trigger,
 * clamp to the viewport, flip when there is no room below, and dismiss on
 * outside-pointerdown / Escape / scroll. Written three times they drift, and
 * this codebase has recorded that defect eleven times under a name it earned:
 * two rules in one system, and the silent one wins.
 *
 * Two hard rules are encoded here rather than left to each call site, because
 * both have already cost a real bug:
 *
 *  1. The layer is PORTALLED and positioned `fixed`. The sidebar and the shell
 *     body are siblings at the same z-index, so anything rendered in place
 *     inside the sidebar is sealed below the page no matter how high its own
 *     z-index goes. See WorkspaceMenu's header for the full account.
 *  2. Placement is measured in `useLayoutEffect`, before paint, so the layer is
 *     never visible at 0,0 for a frame.
 *
 * Scroll closes rather than re-places, because a fixed layer does not travel
 * with its trigger and a menu that drifts away from the control it belongs to
 * is worse than one that shuts. Two exceptions, both in `onScroll` below and
 * both keyboard: a scroll that came from INSIDE the layer is the layer doing
 * its job, and a scroll while focus is inside it re-places instead of closing.
 */

const GAP = 6;
const EDGE = 8;
/** Below this much room underneath, the layer opens upward instead. */
const MIN_BELOW = 180;

export interface AnchoredPlacement {
  left: number;
  top: number;
  /** Set when the layer flipped above the trigger, so it can invert its origin. */
  above: boolean;
  /** The trigger's width, for layers that want to match it. */
  triggerWidth: number;
  /** How tall the layer may grow before it must scroll. */
  maxHeight: number;
}

export interface UseAnchoredLayerOptions {
  open: boolean;
  onClose: () => void;
  /** Match the trigger's width (Select) rather than sizing to content (Menu). */
  matchTriggerWidth?: boolean;
  /** Right-align the layer against the trigger's right edge. */
  align?: "start" | "end";
}

export function useAnchoredLayer<T extends HTMLElement, L extends HTMLElement>(
  { open, onClose, matchTriggerWidth, align = "start" }: UseAnchoredLayerOptions,
): {
  triggerRef: RefObject<T | null>;
  layerRef: RefObject<L | null>;
  placement: AnchoredPlacement | null;
  mounted: boolean;
} {
  const triggerRef = useRef<T | null>(null);
  const layerRef = useRef<L | null>(null);
  const [placement, setPlacement] = useState<AnchoredPlacement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portals need a document. Rendering one during SSR throws.
  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const layer = layerRef.current;
    const width = matchTriggerWidth ? r.width : (layer?.offsetWidth ?? 220);

    const roomBelow = window.innerHeight - r.bottom - GAP - EDGE;
    const roomAbove = r.top - GAP - EDGE;
    // Flip only when below is genuinely cramped AND above is better. A layer
    // that flips whenever it *could* jumps around for no reason the user can see.
    const above = roomBelow < MIN_BELOW && roomAbove > roomBelow;

    const rawLeft = align === "end" ? r.right - width : r.left;
    const left = Math.min(Math.max(EDGE, rawLeft), Math.max(EDGE, window.innerWidth - width - EDGE));

    setPlacement({
      left,
      top: above ? r.top - GAP : r.bottom + GAP,
      above,
      triggerWidth: r.width,
      maxHeight: Math.max(140, above ? roomAbove : roomBelow),
    });
  }, [matchTriggerWidth, align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // The layer is no longer a descendant of the trigger, so both roots count.
      if (triggerRef.current?.contains(target) || layerRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        triggerRef.current?.focus();
      }
    };
    /**
     * Scroll closes the layer, but only when it is the PAGE that moved.
     *
     * The listener is capturing, so it sees every scroll in the document,
     * including the layer scrolling its own overflowing list. That made the
     * control dismiss itself in the middle of being used: walking a menu with
     * ArrowDown scrolls the layer to keep the focused item visible, Select
     * calls `scrollIntoView` on the active row for exactly the same reason, and
     * each of those raised a scroll event that closed the thing the user was
     * reading. A menu that shuts on the second Down key is not keyboard
     * operable at all.
     *
     * When focus is inside the layer the page moving is not a reason to close
     * either, because the user is still in the control; the layer is re-placed
     * instead so it keeps tracking its trigger. Closing stays the answer for
     * the case it was written for, which is a fixed layer left stranded over a
     * page that has scrolled out from under it while nobody was in it.
     */
    const onScroll = (e: Event) => {
      const layer = layerRef.current;
      const target = e.target as Node | null;
      if (layer && target && (layer === target || layer.contains(target))) return;
      if (layer && layer.contains(document.activeElement)) {
        place();
        return;
      }
      onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open, onClose, place]);

  return { triggerRef, layerRef, placement, mounted };
}

/**
 * Style object for a placed layer.
 *
 * `above` anchors from the bottom so the layer grows upward from the trigger
 * rather than downward off the top of the screen.
 */
export function layerStyle(p: AnchoredPlacement, matchTriggerWidth?: boolean): React.CSSProperties {
  return {
    position: "fixed",
    left: p.left,
    ...(p.above ? { bottom: window.innerHeight - p.top } : { top: p.top }),
    ...(matchTriggerWidth ? { width: p.triggerWidth } : null),
    maxHeight: p.maxHeight,
  };
}
