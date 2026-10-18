
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useAnchoredLayer, layerStyle } from "./useAnchoredLayer";

/**
 * An action menu on the one placement engine.
 *
 * `useAnchoredLayer` was built to be the single answer for everything that
 * hangs off a trigger, and then three shell popovers went on hand-rolling
 * their own: the avatar menu, the workspace switcher and the inbox. Each
 * measured nothing, positioned itself with `position: absolute` inside a
 * `position: relative` parent, and wrote its own outside-click and Escape
 * handling. That is the defect Operating Doc 11.1 records eleven instances of,
 * and here it had already cost two real bugs:
 *
 *  1. A layer rendered IN PLACE inside the sidebar is sealed under the page.
 *     The sidebar and the shell body are siblings at the same z-index and the
 *     sidebar is a stacking context, so no z-index on the layer can lift it
 *     out. Only a portal escapes.
 *  2. A layer that never measures cannot know it has run off the bottom of the
 *     viewport, so a menu near the foot of the window is simply unreachable.
 *
 * The engine solves both, plus flip-when-cramped, viewport clamping, and
 * dismissal on outside-pointerdown, Escape and scroll.
 *
 * TWO MENUS IN THE PRODUCT DO NOT ROUTE THROUGH THIS COMPONENT, AND THIS
 * SENTENCE USED TO SAY OTHERWISE. It claimed universal inheritance - that
 * nothing in the product held half of this contract - while the two Report
 * actions popovers - `apps/web/src/app/[org]/reports/reports-library.tsx` and
 * `apps/web/src/app/[org]/reports/[reportId]/report-toolbar.tsx` - hand-rolled
 * their own `role="menu"` and inherited none of it. That is the first sentence
 * a reader of this file meets, and it told the next author the shared contract
 * already covered their call site.
 *
 * What those two have now is the KEYBOARD half, written out by hand at each
 * site: Escape closes and returns focus to the trigger, the arrow keys and
 * Home/End move between items, and focus leaving the popover closes it. What
 * they do NOT have is anything this component gets from the layer engine - the
 * portal, the measurement, flip-when-cramped, viewport clamping, or the roving
 * tabindex that makes a menu one tab stop instead of one per item. Routing both
 * through `Menu` is the outstanding fix; it changes where those popovers are
 * painted, on two production surfaces this repository has no rendered test for,
 * which is why it is written down here rather than done blind.
 *
 * `apps/web/test/accessibility/keyboard.test.ts` derives the set of files that
 * declare a `role="menu"` and fails if this paragraph claims universality while
 * that set has a member outside this file - and fails the other way when the
 * last one is routed through here and this paragraph is not corrected.
 *
 * `children` receives `close` so an item can act and dismiss in one gesture
 * without each call site re-deriving the open state.
 *
 * The keyboard contract is the WAI-ARIA menu button pattern, implemented here
 * rather than at each call site because the items are the caller's and the
 * focus order is not. The layer is portalled to the end of `document.body`, so
 * without it Tab from the trigger did not reach the menu at all: it went to
 * whatever followed the trigger in the page, and the menu items sat past every
 * other control in the document. The account menu holds Sign out, and the
 * workspace switcher holds the whole list of workspaces, so both were reachable
 * by pointer only.
 */
export function Menu({
  trigger,
  label,
  align = "end",
  minWidth = 220,
  maxWidth,
  triggerClassName,
  triggerTitle,
  children,
}: {
  /** The control the menu hangs from. Rendered inside the real button. */
  trigger: ReactNode;
  /** Accessible name for the trigger, e.g. "Account menu". */
  label: string;
  /** `end` right-aligns the layer against the trigger, which is the norm for a
   *  menu in the top-right corner of a bar. */
  align?: "start" | "end";
  minWidth?: number;
  maxWidth?: number;
  /**
   * Replaces the default trigger styling.
   *
   * The workspace switcher's trigger is a monogram and a name laid out by the
   * sidebar's own brand block, not a bare wrapper, so it brings its class
   * rather than fighting one.
   */
  triggerClassName?: string;
  triggerTitle?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, layerRef, placement, mounted } = useAnchoredLayer<HTMLButtonElement, HTMLDivElement>({
    open,
    onClose: close,
    align,
  });
  const layerId = useRef(`sg-menu-${Math.random().toString(36).slice(2, 9)}`).current;

  /**
   * What an item calls when it acts. Closing alone is not enough: the layer is
   * a portal, so when React removes it the element that had focus stops
   * existing and focus falls to `<body>`. The next Tab then starts again from
   * the top of the document, which for a menu in the top bar means walking the
   * entire page to get back to where the user already was.
   *
   * Escape has always restored the trigger (useAnchoredLayer does it); this is
   * the same restoration for the other two ways out, an item and Tab.
   */
  const closeAndReturn = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [triggerRef]);

  /** The items, in visual order. Disabled ones are not a focus stop. */
  const itemsOf = useCallback(
    () =>
      [...(layerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])].filter(
        (el) => !el.hasAttribute("disabled"),
      ),
    [layerRef],
  );

  /**
   * Move focus to one item, wrapping at both ends, and carry the tab stop with
   * it (roving tabindex). Only the item that has focus stays tabbable, so a
   * menu of nine items is one stop rather than nine, which is what the pattern
   * requires and what makes Tab-to-leave mean the menu rather than one row.
   *
   * The tabIndex is set on the DOM node instead of through a prop because the
   * items belong to the caller. Menu never sees them as elements.
   */
  const focusItem = useCallback(
    (index: number) => {
      const items = itemsOf();
      if (items.length === 0) {
        layerRef.current?.focus();
        return;
      }
      const at = ((index % items.length) + items.length) % items.length;
      for (const [i, el] of items.entries()) el.tabIndex = i === at ? 0 : -1;
      items[at]!.focus();
    },
    [itemsOf, layerRef],
  );

  /**
   * Focus enters the menu once, when it opens.
   *
   * `placement` has to be in the dependencies because the layer is not in the
   * DOM until it is placed, and the ref latch is there because `placement` is a
   * fresh object on every re-measure: without it a window resize while the menu
   * is open would throw focus back to the first item mid-navigation.
   */
  const entered = useRef(false);
  useEffect(() => {
    if (!open) {
      entered.current = false;
      return;
    }
    if (entered.current || !placement) return;
    entered.current = true;
    focusItem(0);
  }, [open, placement, focusItem]);

  /**
   * The layer's key handling, and the reason it is also `tabIndex={-1}` in the
   * markup below: a menu that renders with no items still has to hold focus,
   * because with nowhere inside to land focus stays on the page behind an open
   * menu, which `aria-expanded` has just told the reader is covered.
   */
  function onLayerKeyDown(e: ReactKeyboardEvent) {
    const items = itemsOf();
    const at = items.indexOf(document.activeElement as HTMLElement);
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusItem(at + 1);
        break;
      case "ArrowUp":
        // From the layer itself (at === -1) Up means the last item, not the
        // one before the first.
        e.preventDefault();
        focusItem(at <= 0 ? items.length - 1 : at - 1);
        break;
      case "Home":
        e.preventDefault();
        focusItem(0);
        break;
      case "End":
        e.preventDefault();
        focusItem(items.length - 1);
        break;
      case "Tab":
        // Tab leaves the menu, and the only place it can sensibly leave to is
        // the trigger. Letting the default run would walk focus into whatever
        // follows the layer, which is the end of document.body: an invisible
        // point with nothing after it and no way back to the page.
        e.preventDefault();
        closeAndReturn();
        break;
    }
  }

  // Built above the return, the way Select builds its listbox, so the portal
  // call stays one line and the layer's own props are not read through it.
  const layer =
    open && placement ? (
      <div
        ref={layerRef}
        id={layerId}
        role="menu"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onLayerKeyDown}
        className="sg-popover sg-menu__layer"
        style={{ ...layerStyle(placement), minWidth, maxWidth }}
      >
        {children(closeAndReturn)}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? layerId : undefined}
        aria-label={label}
        title={triggerTitle}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          // Down and Up open the menu from the trigger, which is the half of
          // the pattern a pointer user never notices is missing.
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={triggerClassName ?? "sg-menu__trigger"}
      >
        {trigger}
      </button>
      {mounted && layer ? createPortal(layer, document.body) : null}
    </>
  );
}
