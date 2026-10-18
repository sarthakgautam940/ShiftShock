
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { Button, type ButtonVariant } from "./Button";
import { Input } from "./Field";

/* ------------------------------------------------- §4.20 Modal / Confirm */

/**
 * Everything inside the panel that keyboard focus can actually land on.
 *
 * The selector on its own is not a focus order. It matches disabled controls,
 * controls a caller has deliberately taken out of the tab order with
 * `tabindex="-1"`, and the branches of a panel that are currently rendered but
 * not displayed. A trap built on the raw NodeList wraps Tab to an element that
 * refuses focus, which reads to the user as the key doing nothing at all.
 *
 * Visibility is measured with `getClientRects` rather than `offsetParent`,
 * because the panel lives inside a `position: fixed` layer and `offsetParent`
 * reports null for a fixed subtree that is plainly on screen.
 */
function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const all = root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]");
  return [...all].filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.getClientRects().length > 0,
  );
}

export interface DialogFocusOptions {
  /** Called on Escape. Omit for a dialog that deliberately may not be left. */
  onClose?: () => void;
  /** While true, Escape is refused — the dialog is asking a question. */
  dirty?: boolean;
  /** Freeze the page behind the panel while it is open. */
  lockScroll?: boolean;
  /**
   * False when another dialog is on top of this one. Guards the Tab trap only:
   * a hidden dialog that still traps Tab fights the one the reader is actually
   * using. Defaults true, so every existing caller keeps the whole contract.
   */
  active?: boolean;
}

/**
 * THE FOCUS HALF OF `aria-modal`, AND THE ONLY COPY OF IT IN THE PRODUCT.
 *
 * `aria-modal="true"` is a promise to assistive technology that nothing outside
 * the element carrying it exists. It is markup only: it moves no focus and
 * stops no key. A dialog that declares it and then lets Tab walk into the page
 * behind is worse than one that declares nothing, because the reader is now
 * standing on content their screen reader has been told is not there, with no
 * announced route back.
 *
 * THIS WAS TWO COPIES FOR ONE REVISION AND THAT IS WHY IT IS HERE. `Modal`
 * carried it inline; the pass that fixed the session-end countdown could not
 * write to `packages/ui/src/index.ts`, so it pasted the selector, the three
 * filters and all four Tab branches into `apps/web/src/components/shell/`
 * instead, and left a regex to notice if the two drifted. A regex that asks
 * whether both files contain a Tab branch cannot see a changed Tab branch. One
 * export line was the whole obstacle, and trading it for a second copy of the
 * product's most subtle focus code was the wrong trade. `Modal` calls this;
 * every dialog in the application shell calls this; there is no other
 * implementation.
 *
 * WHY THE HANDLERS AND THE REF GO THROUGH REFS. This effect's cleanup is a
 * FOCUS CHANGE, so it must not re-run while the dialog is open. Every call site
 * passes `onClose={() => setOpen(false)}`, a new function each render; with
 * `onClose` in the dependency array every keystroke in any modal field tore the
 * effect down, and the teardown calls `previouslyFocused.focus()` — which threw
 * the caret back to whatever had focus when the dialog opened. Typing into the
 * second field of the invite modal accepted one character and then jumped back
 * to the email box, one letter at a time. `panelRef` is in the same position:
 * it is stable for every caller today, and a caller who built one inline would
 * reintroduce that defect, so the ref object is read through a box too and the
 * dependency array is `[open]` alone.
 *
 * WHAT IT DOES NOT DO: it does not decide whether Escape may close the dialog.
 * A caller that passes no `onClose` gets no Escape, which is what the session
 * countdown wants — a countdown you cannot stop and can dismiss teaches people
 * the dialog is noise.
 */
/* =====================================================================
   ONE DIALOG AT A TIME

   Two open dialogs used to render two panels and two scrims, and the one
   underneath stayed fully drawn behind a second layer of dim. The reader saw a
   card on a card on a page: three planes for one decision, and no way to tell
   which of the two was asking them something.

   They are still both MOUNTED, which is the point. Unmounting the one
   underneath would throw away whatever the reader had typed into it, and a
   dialog that forgets what you told it because a second one interrupted is a
   worse failure than the one this fixes. So the lower one is hidden instead:
   faded, inert, and unreachable, and it comes back exactly as it was.

   A module-level store rather than a context, because a dialog can be rendered
   anywhere - the step-up host sits at the app root while the dialog it lands on
   sits deep in a page - and requiring a shared provider between them would make
   the stacking depend on where somebody happened to mount things.
   ===================================================================== */

let openDialogs: string[] = [];
const stackListeners = new Set<() => void>();

function notifyStack() {
  for (const listener of stackListeners) listener();
}

function subscribeStack(listener: () => void) {
  stackListeners.add(listener);
  return () => {
    stackListeners.delete(listener);
  };
}

/** The id of the dialog currently on top, or "" when none is open. */
function topDialog(): string {
  return openDialogs.length > 0 ? (openDialogs[openDialogs.length - 1] as string) : "";
}

/**
 * Registers an open dialog and reports whether it is the topmost one.
 *
 * The server snapshot is a constant empty string: no dialog is open during a
 * server render, and returning a value that could differ between the two passes
 * is what `useSyncExternalStore` exists to refuse.
 */
function useIsTopDialog(open: boolean): boolean {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    openDialogs = [...openDialogs, id];
    notifyStack();
    return () => {
      openDialogs = openDialogs.filter((entry) => entry !== id);
      notifyStack();
    };
  }, [open, id]);
  const top = useSyncExternalStore(subscribeStack, topDialog, () => "");
  // Before the effect runs there is no entry, and claiming NOT to be topmost in
  // that first frame would flash the dialog as hidden on the way in.
  return !open || top === "" || top === id;
}

export function useDialogFocus<T extends HTMLElement>(
  open: boolean,
  panelRef: RefObject<T | null>,
  options: DialogFocusOptions = {},
) {
  const onCloseRef = useRef(options.onClose);
  const panelBox = useRef(panelRef);
  const dirtyRef = useRef(options.dirty);
  const lockScrollRef = useRef(options.lockScroll);
  /*
   * WHETHER THIS DIALOG IS THE ONE BEING TALKED TO, held in a ref for the same
   * reason as everything else here: the effect's dependency array is `[open]`
   * alone, and it must stay that way. Toggling it through the deps would tear
   * the effect down when a second dialog opened, and the cleanup MOVES FOCUS -
   * so opening the step-up would have yanked the caret out of the step-up and
   * back onto whatever opened the dialog underneath it.
   *
   * It guards the Tab branch and nothing else. Escape is deliberately left
   * live on both: a reader pressing Escape twice-deep means "out", and the
   * dialog underneath closing with it is the behaviour, not a leak.
   */
  const activeRef = useRef(options.active !== false);
  onCloseRef.current = options.onClose;
  dirtyRef.current = options.dirty;
  lockScrollRef.current = options.lockScroll;
  activeRef.current = options.active !== false;
  panelBox.current = panelRef;

  useEffect(() => {
    if (!open) return;
    // Read once, at the moment the dialog opens, so a caller whose ref object
    // is not stable cannot make this effect tear down and steal the caret.
    const dialogRef = panelBox.current;
    const lockScroll = lockScrollRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      /*
       * ESCAPE IS NOT GATED ON `active`, AND THE SCRIM IS. That asymmetry is
       * the design rather than an oversight, so it is written here before
       * somebody makes the two agree.
       *
       * Every open dialog binds this handler, so one Escape closes the whole
       * stack and returns the reader to the page. The scrim and the corner
       * cross close one layer, so dismissing a step-up prompt returns to the
       * decision that raised it rather than throwing that decision away too.
       *
       * Two exits at two depths, because the reader means two different things.
       * Clicking beside a panel is "not this one"; Escape is "out of all of
       * this", and it is the key somebody reaches for when they are lost. A
       * stack that peels one layer per press asks a person who wants out to
       * guess how deep they are.
       */
      if (e.key === "Escape" && !dirtyRef.current) onCloseRef.current?.();
      // A hidden dialog holds no focus, so a trap here would fight the one on
      // top: `focusablesIn` finds nothing inside an inert panel, and the branch
      // below would then pull focus onto a panel the reader cannot see.
      if (e.key === "Tab" && activeRef.current) {
        const items = focusablesIn(dialogRef.current);
        const active = document.activeElement;
        if (items.length === 0) {
          // A dialog with no controls at all still may not leak focus: the page
          // behind it is hidden from assistive technology by aria-modal, so a
          // Tab out lands the user somewhere they have been told is not there.
          e.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (!dialogRef.current?.contains(active)) {
          // This branch is the whole reason the two-ended version was not a
          // trap. It only ever acted when focus was ON the first or last item,
          // so from the panel itself — which is where focus starts — Tab walked
          // straight out into the document behind the dialog and kept going.
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }
        if (e.shiftKey && active === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && active === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    if (lockScroll) document.body.style.overflow = "hidden";

    /**
     * Focus has to be INSIDE the dialog, because `aria-modal` tells assistive
     * technology that nothing outside it exists. Leaving focus on the button
     * that opened it announced the page as hidden while the cursor was still
     * standing on the hidden part: nothing to read, and no route in except Tab.
     *
     * The panel itself takes focus rather than the first field, so the dialog's
     * name is read before any control. The guard is for call sites that mark a
     * field `autoFocus`, or that focus a field in an effect of their own: React
     * applies `autoFocus` during the layout phase, before this passive effect,
     * so focusing unconditionally would take the caret off the field the caller
     * asked for.
     */
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      if (lockScroll) document.body.style.overflow = "";
      // Where the reader was. Without it, closing drops focus to `<body>` and
      // the next Tab restarts at the top of the document.
      previouslyFocused?.focus();
    };
    // `open` ALONE. See the note above the refs: this cleanup moves focus, so
    // a dependency that churns throws the caret out of the dialog mid-typing.
  }, [open]);
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: 400 | 560 | 720;
  /** Blocks Esc/scrim close while a form inside is dirty (§4.28). */
  dirty?: boolean;
  /**
   * Makes the panel itself a `<form>`, so Enter in any field runs this handler.
   *
   * Without it a caller's own `<form>` sits inside `.sg-modal__body` while the
   * action button sits in the footer, a DOM sibling outside that form. Enter
   * then submits past the button entirely: past its `disabled`, past its
   * `loading`, past every guard the button carries. Passing `onSubmit` here
   * puts the whole panel in one form so the footer button is the real submit
   * control and Enter can only do what pressing it does.
   *
   * Footer buttons must then declare `type` explicitly. A `<button>` with no
   * type inside a form is a submit button, so an untyped Cancel would submit.
   */
  onSubmit?: (e: FormEvent) => void;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * A close control in the corner. Default TRUE, because a dialog whose only
   * exit is a key you have to know about is a dialog some readers cannot leave
   * - and the one that prompted this, the step-up prompt, is the one a person
   * meets when they are already unsure.
   *
   * Pass false where the footer already carries an explicit way out and a
   * second one would read as a third choice: `ConfirmModal` does, because its
   * cancel button is always there and always says what declining means.
   *
   * It is not rendered while `dirty`, for the same reason Escape and the scrim
   * are inert then: a control that silently does nothing is worse than one that
   * is not offered.
   */
  closeButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  width = 560,
  dirty,
  onSubmit,
  children,
  footer,
  closeButton = true,
}: ModalProps) {
  // A callback ref, because the panel is a <form> when `onSubmit` is supplied
  // and a <div> when it is not, and one typed useRef cannot hold both.
  const panelRef = useRef<HTMLElement | null>(null);

  /**
   * The whole focus contract, from the one implementation of it above: Tab is
   * trapped in all four directions, focus starts inside the panel, Escape
   * closes unless a form inside is dirty, the page behind is frozen, and focus
   * goes back to whatever opened this when it closes.
   */
  /*
   * Both dialogs stay mounted; only the top one is shown. Unmounting the one
   * underneath would discard whatever the reader had typed into it, and a
   * dialog that forgets what you told it because a second one interrupted is a
   * worse failure than the layering this fixes.
   */
  const isTop = useIsTopDialog(open);

  useDialogFocus(open, panelRef, { onClose, dirty, lockScroll: true, active: isTop });

  if (!open) return null;

  /**
   * The dialog role sits on the PANEL, not on the full-screen layer around it.
   * `aria-modal` asks assistive technology to ignore everything outside the
   * element carrying it, and the layer is the whole viewport, so on the layer
   * it excluded nothing and named a box the size of the screen.
   *
   * `tabIndex={-1}` is what lets the effect above put focus here: a plain div
   * cannot receive it, and the panel must, because the dialog's name is what a
   * screen reader should read first.
   */
  const panelProps = {
    className: "sg-modal__panel",
    style: { maxWidth: width },
    ref: (el: HTMLElement | null) => {
      panelRef.current = el;
    },
    role: "dialog",
    "aria-modal": true,
    "aria-label": title,
    tabIndex: -1,
    /*
     * `inert` rather than `aria-hidden` alone. A hidden dialog must be
     * unreachable by pointer AND by assistive technology AND by Tab, and
     * `inert` is the one attribute that says all three - `aria-hidden` on a
     * container holding focusable controls is a well-known way to strand a
     * screen-reader user on a control the page claims is not there.
     */
    inert: !isTop,
    "data-behind": !isTop,
  } as const;

  const contents = (
    <>
      {closeButton && !dirty ? (
        /*
         * `type="button"` is not optional here. The panel becomes a <form> when
         * the caller passes `onSubmit`, and a <button> with no type inside a
         * form is a SUBMIT button - so an untyped close control would submit
         * the dialog it was meant to abandon.
         */
        <button
          type="button"
          className="sg-iconbtn sg-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} aria-hidden />
        </button>
      ) : null}
      <h2 className="sg-modal__title">{title}</h2>
      <div className="sg-modal__body">{children}</div>
      {footer ? <div className="sg-modal__footer">{footer}</div> : null}
    </>
  );

  return (
    <>
      {/* One layer of dim for any depth of dialog. Two scrims stacked read as a
          darker page rather than as a second decision, and the panel underneath
          stayed fully drawn behind both. */}
      <div
        className="sg-scrim"
        data-behind={!isTop}
        onClick={dirty || !isTop ? undefined : onClose}
        aria-hidden
      />
      <div className="sg-modal" data-behind={!isTop}>
        {/* The form REPLACES the panel div rather than nesting inside it, so
            the flex column that lays out title / scrolling body / footer is
            still the direct parent of all three. */}
        {onSubmit ? (
          <form {...panelProps} onSubmit={onSubmit}>
            {contents}
          </form>
        ) : (
          <div {...panelProps}>{contents}</div>
        )}
      </div>
    </>
  );
}

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  /** The consequence sentence - what happens, plainly. */
  consequence: string;
  /** Affected object rendered mono (§4.20). */
  affected?: string;
  /** Irreversible tier: the user types this exact string to arm the button. */
  typedMatch?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  /**
   * Anything the decision depends on that a sentence cannot carry: a list of
   * what is affected, a choice about a side effect.
   *
   * Rendered BETWEEN the affected object and the typed confirmation, because
   * the typed confirmation is the last thing before the button and anything
   * placed after it reads as an afterthought to a decision already made.
   */
  children?: ReactNode;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  consequence,
  affected,
  typedMatch,
  children,
  confirmLabel,
  confirmVariant = "danger",
}: ConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const armed = typedMatch ? typed === typedMatch : true;

  useEffect(() => {
    if (open) {
      setTyped("");
      // Focus starts on Cancel; destructive buttons never gain it by default.
      setTimeout(() => cancelRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Modal
      /* The footer's cancel is always present and always says what declining
         means, so a corner cross would be a third way to say one thing. */
      closeButton={false}
      open={open}
      onClose={onClose}
      title={title}
      width={400}
      footer={
        <>
          <Button ref={cancelRef} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            disabled={!armed}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{consequence}</p>
      {affected ? (
        <p className="sg-mono" style={{ margin: "10px 0 0", color: "var(--text-primary)" }}>
          {affected}
        </p>
      ) : null}
      {children}
      {typedMatch ? (
        <div style={{ marginTop: 12 }}>
          <span className="sg-micro" style={{ display: "block", marginBottom: 6 }}>
            Type <strong className="sg-mono">{typedMatch}</strong> to confirm.
          </span>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Confirmation" />
        </div>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------------------ §4.19 Toast */

export interface ToastOptions {
  tone?: "default" | "error";
  /** Standard on ack/resolve/mute/archive (§4.19). */
  action?: { label: string; onAction: () => void };
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

const TOAST_MS = 8000;

/**
 * One toast, owning its own clock.
 *
 * The timer used to be started inside `show`, which put it out of reach of
 * everything that should be able to stop it. Three consequences, all of them
 * WCAG 2.2.1 (Timing Adjustable):
 *
 *  1. Nothing could pause it. Eight seconds is the whole reading budget for a
 *     sentence that appears in the corner of the screen while the reader is
 *     looking somewhere else, and a screen magnifier user, or anyone who reads
 *     slowly, or anyone who simply glanced away, got no second chance.
 *  2. The toast carrying an UNDO expired on the same clock. That is the one
 *     toast that is not a notification but a control: the only route back from
 *     an archive or a mute, disappearing on a timer while the user is still
 *     deciding whether they meant it.
 *  3. Only error toasts rendered a Dismiss button, so a keyboard user could
 *     not clear anything else - the toast simply sat there until its timer ran
 *     out, and the region is at the end of the document, past every control on
 *     the page.
 *
 * Hover and focus both pause, because the pointer and the keyboard are two ways
 * of doing the same thing and a control that only answers the mouse is the
 * defect one layer down. Leaving restarts the full duration rather than
 * resuming a remainder: it is simpler, and every way it is wrong gives the
 * reader more time rather than less.
 */
function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [held, setHeld] = useState(false);

  // An action makes the toast a control, and a control may not expire. Errors
  // were already exempt and stay exempt.
  const sticky = toast.tone === "error" || Boolean(toast.action);

  useEffect(() => {
    if (sticky || held) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.durationMs ?? TOAST_MS);
    return () => clearTimeout(timer);
  }, [sticky, held, toast.id, toast.durationMs, onDismiss]);

  const hold = () => setHeld(true);
  const release = () => setHeld(false);

  return (
    <div
      className={toast.tone === "error" ? "sg-toast sg-toast--error" : "sg-toast"}
      onMouseEnter={hold}
      onMouseLeave={release}
      // React's onFocus/onBlur are focusin/focusout, so they fire for the
      // buttons inside as well. A plain DOM focus/blur would not bubble and
      // tabbing to Undo would let the toast expire under the user's hands.
      onFocus={hold}
      onBlur={release}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.action ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            toast.action?.onAction();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </Button>
      ) : null}
      {/* Every toast, not only the errors: a toast that cannot be dismissed can
          only be waited out, and the one carrying an action no longer expires
          at all, so without this there would be no way to close it. */}
      {/*
       * ====== THE CLOCK, MADE VISIBLE ======
       *
       * The toast already expired on its own and already paused under the
       * pointer. Neither was visible, so a reader watching a message they had
       * not finished had no way to know whether it was about to leave or
       * whether resting the cursor on it had stopped it.
       *
       * The ring traces the dismiss control clockwise from the top and the
       * message leaves when it closes. It is drawn ONLY on a toast that
       * actually expires: an error and a toast carrying an action are sticky,
       * and a countdown that never finishes is a lie told slowly.
       *
       * `data-held` pauses the animation rather than restarting it, so the time
       * already elapsed is kept - which is what makes the pause read as a pause
       * rather than as a reset.
       */}
      <span
        className={sticky ? "sg-toast__dismiss" : "sg-toast__dismiss sg-toast__dismiss--timed"}
        data-held={held ? "true" : undefined}
        style={
          sticky ? undefined : ({ "--sg-toast-ms": `${toast.durationMs ?? TOAST_MS}ms` } as CSSProperties)
        }
      >
        <Button size="sm" variant="ghost" onClick={() => onDismiss(toast.id)}>
          Dismiss
        </Button>
      </span>
    </div>
  );
}

const ToastContext = createContext<{ show: (message: string, options?: ToastOptions) => void } | null>(
  null,
);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast requires <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * The clock lives in `Toast` now, not here.
   *
   * A `setTimeout` fired at creation time is a timer nobody holds: `show`
   * returns, the closure is the only reference, and there is no way for hover,
   * focus or an Undo button to reach it. Handing the toast its own effect is
   * what makes the duration something the reader can interrupt.
   */
  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev.slice(-2), { id, message, ...options }]);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="sg-toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
