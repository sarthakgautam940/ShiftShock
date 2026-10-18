import type { ReactNode } from "react";
import { cx } from "../cx";

/**
 * The workspace primitives: page composition plus the product-native objects
 * (contract shape, comparison, coverage, evidence support, lifecycle). Styling
 * lives in workspace.css. Every route composes from these so the product reads
 * as one system rather than one template repeated with different nouns.
 */

/* ------------------------------------------------------------------ regions */

export function Region({
  title,
  note,
  aside,
  actions,
  spacing,
  children,
}: {
  title?: ReactNode;
  note?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  spacing?: "tight" | "loose";
  children: ReactNode;
}) {
  const head = title || aside || actions;
  return (
    <section
      className={cx(
        "sg-region",
        spacing === "tight" && "sg-region--tight",
        spacing === "loose" && "sg-region--loose",
      )}
    >
      {head ? (
        <div className="sg-region__head">
          <div style={{ minWidth: 0 }}>
            {title ? <h2 className="sg-region__title">{title}</h2> : null}
            {note ? <p className="sg-region__note">{note}</p> : null}
          </div>
          {aside || actions ? (
            <div className="sg-region__aside">
              {aside}
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Split({
  rail,
  wideRail,
  children,
}: {
  rail: ReactNode;
  wideRail?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cx("sg-split", wideRail && "sg-split--wide-rail")}>
      <div style={{ minWidth: 0 }}>{children}</div>
      <aside style={{ minWidth: 0 }}>{rail}</aside>
    </div>
  );
}

/* ----------------------------------------------------------------- measures */

export function Measure({
  label,
  value,
  unit,
  note,
  size,
  empty,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  note?: ReactNode;
  size?: "sm" | "lg";
  empty?: boolean;
}) {
  return (
    <div className={cx("sg-measure", size === "lg" && "sg-measure--lg", size === "sm" && "sg-measure--sm")}>
      <div className="sg-measure__label">{label}</div>
      <div className="sg-measure__value" data-empty={empty ? "true" : undefined}>
        {value}
        {unit ? <span className="sg-measure__unit">{unit}</span> : null}
      </div>
      {note ? <div className="sg-measure__note">{note}</div> : null}
    </div>
  );
}

export function MeasureBand({ inset, children }: { inset?: boolean; children: ReactNode }) {
  return <div className={cx("sg-band", inset && "sg-band--inset")}>{children}</div>;
}

export function RailFact({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="sg-rail-fact">
      <span className="sg-rail-fact__label">{label}</span>
      <span className="sg-rail-fact__value">{value}</span>
    </div>
  );
}

export function Fact({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div>
      <div className="sg-fact__label">{label}</div>
      <div className="sg-fact__value">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------- planes */

/**
 * The plane a ledger sits on.
 *
 * Its content scrolls horizontally rather than being clipped. The plane itself
 * keeps `overflow: hidden` to clip the table's corners to the radius, which is
 * exactly why the scroll has to live one level in: with the clip doing both
 * jobs, a table wider than the panel simply lost its right-hand columns with
 * no way to reach them.
 *
 * `scroll={false}` for content that is not a table and would rather wrap.
 */
export function Plane({
  head,
  flush,
  scroll = true,
  pad,
  children,
}: {
  head?: ReactNode;
  flush?: boolean;
  scroll?: boolean;
  /**
   * PROSE INSIDE A PLANE NEEDS PADDING, AND A TABLE MUST NOT HAVE IT.
   *
   * `.sg-plane` carries no padding on purpose: a ledger's own cells supply it,
   * and adding any here would double every gutter in the product. So a Plane
   * holding a table is correct as it stands - and a Plane holding PARAGRAPHS
   * puts them flat against the border, which is what the account-deletion
   * warning looked like: the first letter touching the frame and the descender
   * of a "y" clipped by the radius.
   *
   * It is a class rather than one screen. Any Plane whose children are not a
   * table has always looked like that, and every future one would. `pad` is the
   * grammar's answer, so the fix is a prop rather than an inline style that the
   * next surface has to remember to copy.
   */
  pad?: boolean;
  children: ReactNode;
}) {
  const body = pad ? <div className="sg-plane__body">{children}</div> : children;
  return (
    <div className={cx("sg-plane", flush && "sg-plane--flush")}>
      {head ? <div className="sg-plane__head">{head}</div> : null}
      {scroll ? <div className="sg-plane__scroll">{body}</div> : body}
    </div>
  );
}

/**
 * A section a reader may open, closed by default.
 *
 * ============ WHY THIS EXISTS ============
 *
 * Two surfaces carried several paragraphs of reference material in the middle
 * of a settings pane - the lifecycle table on Billing and the retention
 * explanation on Data and privacy. Both are TRUE and both are worth being able
 * to read; neither is what somebody opened that screen to do. A reader who has
 * used the product for a year scrolls past them every time, and a reader on
 * their first day is not helped by a wall of text either.
 *
 * A native `<details>`, deliberately, and not a state hook: it is keyboard
 * operable, announced by screen readers as a disclosure, findable by the
 * browser's own in-page search even while closed, and it works before hydration
 * - which matters on a settings page that streams.
 */
export function Disclosure({
  summary,
  children,
}: {
  /** The closed-state label. A question a reader might actually have. */
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="sg-disclosure">
      <summary className="sg-disclosure__summary">{summary}</summary>
      <div className="sg-disclosure__body">{children}</div>
    </details>
  );
}

export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("sg-well", className)}>{children}</div>;
}

/* ------------------------------------------------------------------- ledger */

/**
 * An empty table that keeps its anatomy.
 *
 * The message alone left a ledger reading as a box with a sentence in it. The
 * ghost rows underneath are drawn from the table's own `<td>`s, so they inherit
 * the real column widths: every empty ledger in the product shows the shape of
 * the rows that are coming, and no two look alike because no two tables share
 * a column set. That is what keeps a shared idea from becoming one shared
 * wireframe stamped on every surface.
 */
export function LedgerEmpty({
  span,
  icon,
  title,
  note,
  action,
  ghosts = 3,
}: {
  span: number;
  icon?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  action?: ReactNode;
  ghosts?: number;
}) {
  return (
    <>
      <tr className="sg-ledger__empty">
        <td colSpan={span}>
          <div className="sg-ledger__empty-inner">
            {icon ? <span className="sg-ledger__empty-icon">{icon}</span> : null}
            <span className="sg-ledger__empty-title">{title}</span>
            {note ? <span className="sg-ledger__empty-note">{note}</span> : null}
            {action ? <span className="sg-ledger__empty-act">{action}</span> : null}
          </div>
        </td>
      </tr>
      {Array.from({ length: ghosts }, (_, row) => (
        <tr className="sg-ledger__ghostrow" key={`ghost-${row}`} data-row={row} aria-hidden>
          {Array.from({ length: span }, (_, col) => (
            <td key={col}>
              <span className="sg-ledger__ghostbar" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* -------------------------------------------------------------------- frame */

export function Frame({
  title,
  note,
  actions,
  ghosts,
  children,
}: {
  title: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  ghosts?: number;
  children?: ReactNode;
}) {
  return (
    <div className="sg-frame">
      <div className="sg-frame__body">
        <div className="sg-frame__title">{title}</div>
        {note ? <p className="sg-frame__note">{note}</p> : null}
        {actions ? <div className="sg-frame__actions">{actions}</div> : null}
      </div>
      {ghosts ? (
        <div className="sg-ghosts">
          {Array.from({ length: ghosts }, (_, i) => (
            <div className="sg-ghost" key={i}>
              <span className="sg-ghost__bar sg-ghost__bar--id" />
              <span className="sg-ghost__bar sg-ghost__bar--mid" />
              <span className="sg-ghost__bar sg-ghost__bar--sm" />
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* --------------------------------------------------------- contract objects */

export type FieldChange = "stable" | "added" | "removed" | "type" | "void";

export interface ShapeField {
  name: string;
  type: string;
  change?: FieldChange;
  depth?: 0 | 1;
}

/**
 * The change marker rides on the ROW it describes.
 *
 * It used to live in a gutter column between the two shapes, one glyph per row,
 * paired by index: `baseline[i]` against `current[i]`. That is a positional
 * guess, and it is wrong the moment a field is added or removed anywhere but
 * the end, because every row below it shifts by one and each marker then points
 * at a field it has nothing to do with. On the surface whose entire job is to
 * say precisely what changed, the marker was aimed by array position.
 *
 * On the row there is nothing to align: the field carries its own `change`, so
 * the marker cannot disagree with it. It also removes a column of glyphs that
 * competed with the two shapes it sat between.
 */
const ROW_GLYPH: Record<string, string> = { added: "+", removed: "-", type: "~" };

export function ContractShape({ fields }: { fields: ShapeField[] }) {
  return (
    <div className="sg-shape">
      {fields.map((field, i) => {
        const change = field.change ?? "stable";
        const glyph = ROW_GLYPH[change];
        return (
          <div
            className="sg-shape__field"
            key={`${field.name}-${i}`}
            data-change={change}
            data-depth={field.depth ?? 0}
          >
            <span className="sg-shape__mark" aria-hidden>
              {glyph ?? ""}
            </span>
            <span className="sg-shape__name">{field.name}</span>
            <span className="sg-shape__type">{field.type}</span>
            {glyph ? (
              <span className="sg-visually-hidden">
                {change === "added" ? "added" : change === "removed" ? "removed" : "type changed"}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Saved baseline against current observation. Both sides are padded to the same
 * row count by the caller so the rows stay in register; each row carries its own
 * change marker, so nothing here has to infer which row changed
 * where the contract actually diverges.
 */
export function ContractDiff({
  baseline,
  current,
  baselineLabel = "Saved baseline",
  currentLabel = "Current observation",
}: {
  baseline: ShapeField[];
  current: ShapeField[];
  baselineLabel?: ReactNode;
  currentLabel?: ReactNode;
}) {
  return (
    <div className="sg-diff">
      <div className="sg-diff__side">
        <div className="sg-diff__cap">{baselineLabel}</div>
        <ContractShape fields={baseline} />
      </div>
      {/* No gutter column. The markers moved onto the rows they describe, for
          the reason written on ContractShape: pairing the two sides by array
          index aimed every marker below an added field at the wrong row. */}
      <div className="sg-diff__side">
        <div className="sg-diff__cap">{currentLabel}</div>
        <ContractShape fields={current} />
      </div>
    </div>
  );
}

export function ChangeStatement({
  field,
  from,
  to,
  change,
}: {
  field: string;
  from?: string;
  to?: string;
  change: Exclude<FieldChange, "stable" | "void">;
}) {
  return (
    <span className="sg-change" data-change={change}>
      <span className="sg-change__field">{field}</span>
      {from ? <span className="sg-change__from">{from}</span> : null}
      {from && to ? (
        <span className="sg-change__arrow" aria-hidden>
          &rarr;
        </span>
      ) : null}
      {to ? <span className="sg-change__to">{to}</span> : null}
    </span>
  );
}

export function ShapeGlyph({ changes }: { changes: FieldChange[] }) {
  const bars = changes.slice(0, 3);
  while (bars.length < 3) bars.push("stable");
  return (
    <span className="sg-shapeglyph" aria-hidden>
      {bars.map((change, i) => (
        <span
          className="sg-shapeglyph__bar"
          key={i}
          data-change={change === "stable" ? undefined : change}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------- meters */

export function CoverageMeter({
  used,
  ceiling,
  discovered,
  usedLabel = "Monitored",
  ceilingLabel = "Plan ceiling",
}: {
  used: number;
  ceiling: number;
  discovered?: number;
  usedLabel?: string;
  ceilingLabel?: string;
}) {
  const safeCeiling = Math.max(ceiling, 1);
  const usedPct = Math.min(100, (used / safeCeiling) * 100);
  return (
    <div>
      <div className="sg-meter">
        <span className="sg-meter__seg" data-kind="used" style={{ width: `${usedPct}%` }} />
        <span className="sg-meter__seg" data-kind="idle" style={{ width: `${100 - usedPct}%` }} />
      </div>
      <div className="sg-meter__legend">
        <span className="sg-meter__key">
          {usedLabel} <span className="sg-meter__val">{used}</span>
        </span>
        {discovered !== undefined ? (
          <span className="sg-meter__key">
            Discovered <span className="sg-meter__val">{discovered}</span>
          </span>
        ) : null}
        <span className="sg-meter__key">
          {ceilingLabel} <span className="sg-meter__val">{ceiling}</span>
        </span>
      </div>
    </div>
  );
}

/** Observation strength behind a claim: four pips plus the confidence word. */
/**
 * `label` IS REQUIRED, and it used to be optional.
 *
 * The four pips are `aria-hidden`, correctly: they are a picture of a number.
 * With the label absent this component therefore rendered a control whose
 * entire content was hidden - a confidence reading that existed for sighted
 * readers and was silent for everyone else, and colour and fill doing all the
 * work, which is WCAG 1.4.1.
 *
 * Both call sites already passed one, so nothing was broken on any screen the
 * day this changed. That is exactly why it was worth closing: the silent form
 * can no longer be written, at a cost of zero.
 */
export function SupportMeter({ level, label }: { level: 1 | 2 | 3 | 4; label: ReactNode }) {
  return (
    <span className="sg-support">
      <span className="sg-support__pips" aria-hidden>
        {[1, 2, 3, 4].map((pip) => (
          <span className="sg-support__pip" key={pip} data-on={pip <= level ? "true" : "false"} />
        ))}
      </span>
      {label ? <span className="sg-support__label">{label}</span> : null}
    </span>
  );
}

/* ---------------------------------------------------------------- lifecycle */

export interface TrackStep {
  name: string;
  note?: string;
  state: "done" | "current" | "todo";
  stateLabel?: string;
  /**
   * What this step does, if it can be done from here.
   *
   * A step that names an action and shows "Next" reads as a control, so people
   * click the card and the label rather than hunting for the button that
   * actually performs it. Giving the step the action makes the whole card the
   * target instead of a decoration that looks like one.
   */
  onAction?: () => void;
  /** Accessible name for the action, when the step name alone is not a verb. */
  actionLabel?: string;
}

export function LifecycleTrack({ steps }: { steps: TrackStep[] }) {
  return (
    <div className="sg-track">
      {steps.map((step) => {
        const body = (
          <>
            <div className="sg-track__name">{step.name}</div>
            {step.note ? <div className="sg-track__note">{step.note}</div> : null}
            {step.stateLabel ? <div className="sg-track__state">{step.stateLabel}</div> : null}
          </>
        );
        // A real button, not a div with a click handler: it has to be reachable
        // by keyboard and announce itself, and the whole card is the hit area.
        return step.onAction ? (
          <button
            type="button"
            className="sg-track__step"
            key={step.name}
            data-state={step.state}
            data-actionable="true"
            aria-label={step.actionLabel ?? step.name}
            onClick={step.onAction}
          >
            {body}
          </button>
        ) : (
          <div className="sg-track__step" key={step.name} data-state={step.state}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- settings */

export function SettingGroup({ children }: { children: ReactNode }) {
  return <div className="sg-setgroup">{children}</div>;
}

export function SettingRow({
  title,
  note,
  control,
  stack,
  disabled,
}: {
  title: ReactNode;
  note?: ReactNode;
  control?: ReactNode;
  stack?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cx("sg-setrow", stack && "sg-setrow--stack")}
      data-disabled={disabled ? "true" : undefined}
    >
      <div className="sg-setrow__text">
        <div className="sg-setrow__title">{title}</div>
        {note ? <div className="sg-setrow__note">{note}</div> : null}
      </div>
      {control ? <div className="sg-setrow__control">{control}</div> : null}
    </div>
  );
}

/**
 * A row's state, as a word.
 *
 * There is no dot. A coloured dot beside every status turns a ledger into a
 * legend you have to decode, and a column of them reads as decoration running
 * down the page; the word already says the thing, so weight and colour on the
 * word itself carry the state with one element instead of two.
 */
export function StateDot({
  tone,
  children,
}: {
  tone?: "active" | "alarm" | "caution" | "quiet";
  children: ReactNode;
}) {
  return (
    <span className="sg-state" data-tone={tone}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- standing state
   What the page answers before it counts anything. */

/**
 * A numeral inside the standing sentence. Colour lives here and nowhere else in
 * the heading: Resend sets even the word "Poor" in plain ink and lets only the
 * small legend values carry hue, which is the discipline that keeps a status
 * from reading as a coloured paragraph laid on the background.
 */
/**
 * A figure, and the product's only number formatter.
 *
 * The audit found `10565` on the alert digest and `50,134` on dependencies,
 * both live, both shipped, because every surface decided separately whether to
 * call `toLocaleString`. Grouping is not a per-page choice: a reader who sees
 * one number grouped and the next one not reads the second as a different kind
 * of quantity, and on this product they are all counts of the same thing.
 *
 * So `Num` groups any numeric child, and passing a raw count is now the correct
 * call. A child that is already a string is left exactly alone, because it has
 * been formatted deliberately by its caller (a percentage, a byte size, an
 * identifier) and second-guessing that would be the two-rules defect.
 */
/**
 * The size contract (Task 3.5), and it is not the one the plan wrote.
 *
 * 3.5 asked for "a figure that is the page's answer gets display scale, a
 * figure that is a fact gets text scale, and nothing in between". Applying it
 * meant first asking which figures are answers, and the answer is none of
 * these: every one of the thirty call sites is a numeral INSIDE A SENTENCE -
 * "3 alerts failed to reach you", "4 of 40 rest on strong evidence", "12 third
 * parties are on file". Raising a word in a sentence to display scale does not
 * create rank, it breaks the line, and it is how `MeasureBand` spread to nine
 * routes and put four display-scale zeroes at the top of each - the failure
 * `page-archetype.test.ts` exists to prevent. The one figure in the product
 * that genuinely IS a page's answer, the Gate run's verdict, already leads at
 * 20px.
 *
 * So the contract is the opposite and it is stated as a rule rather than left
 * as an accident: **a numeral takes the size of the line it sits in.** Weight,
 * tabular figures and a tone are what separate it from the words around it,
 * which is the same hierarchy-from-weight-and-value the token layer is built
 * on everywhere else.
 *
 * The defect this fixes is the coupling. `Num` rendered
 * `className="sg-phead__n"` - a class named for, and living with, the HEADING
 * BAND - while twenty-four of its call sites are nowhere near one: a contracts
 * pane, a settings paragraph, a gate run's fact list, an account panel. It
 * worked only because that class happens to declare no `font-size`. The day
 * someone tunes a heading band by adding one, every number in the product
 * changes size at once. `.sg-num` owns the numeral now and the band's class
 * composes with it; `tokens.test.ts` fails the build if either declares a size.
 */
export function Num({ children, tone }: { children: ReactNode; tone?: "alarm" | "caution" }) {
  return (
    <b className="sg-num" data-tone={tone}>
      {typeof children === "number" ? formatCount(children) : children}
    </b>
  );
}

/**
 * The grouping rule, exported for the places a figure is not wrapped in `Num`:
 * a table cell, an aria-label, a document title. Fixed `en-US` rather than the
 * visitor's locale, because a grouped thousand rendered as `1.000` beside an
 * English sentence reads as a decimal.
 */
export function formatCount(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US") : String(n);
}

/**
 * The page's name, for heading navigation only.
 *
 * WHAT THIS IS FOR. `PageHead` renders its `title` as the surface's `h1`, and
 * the LEDGER archetype deliberately has no `PageHead` title: `page-archetype.
 * test.ts` records the reason, which is that a breadcrumb already names the
 * page and repeating it at 27px is the surface saying its own name twice for
 * ninety vertical pixels. That decision is about PIXELS and it is right.
 *
 * The consequence was not about pixels. FOUR surfaces - the account panes for
 * Profile, Security, Tokens and Appearance - shipped with NO HEADING OF ANY
 * LEVEL. Each is a list of `SettingRow`s whose titles are `<div>` elements
 * rather than headings. Heading navigation is the way most screen reader users
 * move through a page: press H and go. On those four, H did nothing, and the
 * only way to find out what the page was called was to walk the breadcrumb,
 * which is a `<span>` inside a `<nav>` and is not a heading.
 *
 * FOUR, NOT ELEVEN, AND THIS COMMENT SAID ELEVEN. The first version of the
 * heading gate also reported the seven ledger routes, and every one of those
 * seven was already correct: they pass `title` to `Toolbar`, which renders it
 * as an `h1`, and the gate did not yet know that. Seven false findings were
 * shipped here as fact, in source, where they would outlive the document that
 * corrected them. The corrected count is in
 * `docs/legal/ACCESSIBILITY-STATEMENT.md`, Part B item 4.
 *
 * So the name is restored to the accessibility tree and kept out of the layout.
 * `.sg-srlabel` is the product's visually-hidden class: one pixel, clipped, no
 * border, no padding, and absolutely positioned, so it is out of normal flow
 * and contributes no line box to the layout it is meant to cost nothing.
 *
 * A surface that HAS a visible `PageHead` or `Toolbar` title must not also
 * render this: the page would have two names and two `h1` elements. That rail
 * is enforced across every route by `accessibility/semantics.test.ts` ("no
 * surface names itself twice"), which walks a route through its imports;
 * `settings-single-h1.test.ts` holds the narrower line inside
 * `app/[org]/settings`. Both statements were in this docstring before either
 * gate existed - the cross-route one did not, and adding a `PageName` to a page
 * that already had a title left the suite green.
 */
export function PageName({ children }: { children: ReactNode }) {
  return <h1 className="sg-srlabel">{children}</h1>;
}

/**
 * The heading band. One object, not two.
 *
 * Every route used to open with PageHeader (title plus a doctrine sentence) sat
 * on top of Verdict (a 24px claim plus its consequence): four stacked text
 * blocks and two separate right-hand slots at different heights, which is why
 * the top of every page read as a column of prose pinned to the left edge with
 * dead space beside it.
 *
 * This is one band. The title and one state sentence on the left; the action
 * and the freshness line share a single right-hand column. The sentence carries
 * its own hierarchy the way Attio's do, by splitting one size across two ink
 * values rather than across two type ranks: `lead` is the page's answer, `rest`
 * is why. A page with nothing to report passes `lead` alone.
 */
export function PageHead({
  title,
  lead,
  rest,
  actions,
  meter,
}: {
  /**
   * Omitted inside a shell that already names the page (Settings, Account),
   * where a second title would be the page saying its own name twice. The
   * band is then the standing sentence alone, which is the fused two-sentence
   * heading the reference set uses more than any other opening.
   */
  title?: ReactNode;
  lead?: ReactNode;
  rest?: ReactNode;
  actions?: ReactNode;
  meter?: ReactNode;
}) {
  return (
    <header className="sg-phead">
      <div className="sg-phead__text">
        {title ? <h1 className="sg-phead__title">{title}</h1> : null}
        {lead || rest ? (
          <p className="sg-phead__say">
            {lead ? <span className="sg-phead__lead">{lead}</span> : null}
            {lead && rest ? " " : null}
            {rest}
          </p>
        ) : null}
      </div>
      {actions || meter ? (
        <div className="sg-phead__side">
          {actions ? <div className="sg-phead__act">{actions}</div> : null}
          {meter ? <div className="sg-phead__meter">{meter}</div> : null}
        </div>
      ) : null}
    </header>
  );
}

/**
 * The ledger band: what this surface currently says, then the controls that act
 * on it, above full-bleed content.
 *
 * This is the other half of PageHead, and the reason both exist.
 *
 * A ledger route is not a document. It has no abstract and needs no title,
 * because the breadcrumb in the top bar already names it and repeating that
 * name in 27px type is the page saying its own name twice. Stacking a title, a
 * doctrine paragraph and a separate filter row cost roughly 120 vertical pixels
 * on every list in the product and produced the same silhouette twenty times
 * over.
 *
 * THE CORRECTION, and it was earned twice.
 *
 * The first version put the sentence, the filters and the count on ONE row at
 * 13.5px. That deleted the hierarchy along with the bloat. Everything on the
 * surface became the same size, the tabs sat on the sentence's own baseline,
 * and the whole band read as a disclaimer strip rather than as the page's
 * statement about itself. The operator's word for it was "a rectangle at the
 * top", and the diagnosis was right: an opaque sticky fill with a hairline
 * under it, wrapped around undifferentiated text, IS a bar.
 *
 * So the band is two lines now, not one, and it is the two lines that carry a
 * type rank between them:
 *
 *   the sentence   17px, its own line, no fill, scrolls away with the page
 *   the controls   13px, sticky, canvas fill, hairline beneath
 *
 * Only the control row is sticky, because filters have to stay reachable while
 * a long ledger scrolls and a statement does not. That split is also what
 * removes the bar: the sentence sits on the page ground with nothing behind it,
 * which is the "seamless" the reference set has and the single row never could.
 *
 * It costs about fifteen pixels against the one-row version and still saves
 * fifty against the heading block it replaced.
 *
 * PageHead survives, and belongs on the surfaces where the state statement IS
 * the content: Overview, an event, a run, a report. Those are instruments, and
 * an instrument may lead with its reading.
 */
export function Toolbar({
  title,
  status,
  filters,
  meta,
  actions,
}: {
  /**
   * The page's name, at the same scale every other surface uses.
   *
   * Removing it was wrong and it took three reports to accept that. The
   * argument was Attio's: identity lives in the breadcrumb chip, so a 27px
   * title repeats it. What that misses is that Attio's chip is a real identity
   * element with a type glyph and weight, and ours is 13px of text in a 40px
   * bar. It does not carry a page, so removing the title did not relocate
   * identity, it deleted it.
   *
   * The visible result was worse than the redundancy it avoided: half the
   * product had a heading and half opened with a sentence fragment beside a
   * cluster of numbers, and no reading of that is deliberate.
   */
  title?: ReactNode;
  /** The standing sentence. Its own line, under the title. */
  status?: ReactNode;
  /** Tabs, view chips, search. The control row beneath the sentence. */
  filters?: ReactNode;
  /** Counts and freshness. Quiet, right, before the actions. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  /*
   * A control ROW only exists when there are controls to put in a row.
   *
   * The first version rendered the bar whenever anything at all was passed, so
   * a route with a meter and a button but no filters got a full-width band
   * holding one right-aligned cluster and roughly nine hundred pixels of
   * nothing. Dependencies, Reports and Early warning all rendered that way: a
   * wide empty strip under the sentence, which reads as a component that
   * failed to fill rather than as a toolbar.
   *
   * With no filters there is no row to make. The meta and the actions belong
   * beside the sentence, which is where a heading band always put them and
   * where there is already space.
   */
  /*
   * The same head every other surface has: a title, the sentence under it, and
   * the acts on the right. Then controls, if there are any.
   *
   * The version this replaces put the sentence and the right-hand cluster on
   * ONE compact row with no title, which produced a page opening with a
   * fragment beside a huddle of numbers, and it did that on half the product
   * while the other half kept a proper heading. Nothing about the difference
   * was legible as a decision.
   *
   * There is NO RULE UNDER IT. A hairline separating a heading from its own
   * page is a decorative separator, banned outright by Operating Doc 11.3, and
   * adding one was mine. Space separates these; a line only draws a box.
   */
  return (
    <div className="sg-toolbar">
      <div className="sg-toolbar__head">
        <div className="sg-toolbar__text">
          {title ? <h1 className="sg-toolbar__title">{title}</h1> : null}
          {status ? <p className="sg-toolbar__say">{status}</p> : null}
        </div>
        {meta || actions ? (
          <div className="sg-toolbar__side">
            {meta ? <div className="sg-toolbar__meta">{meta}</div> : null}
            {actions ? <div className="sg-toolbar__act">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      {filters ? <div className="sg-toolbar__bar">{filters}</div> : null}
    </div>
  );
}

export interface FactRow {
  term: ReactNode;
  value: ReactNode;
  /** Renders the value as absence rather than as a score. */
  empty?: boolean;
  note?: ReactNode;
}

/**
 * Facts as a definition list: term left, value right, on one axis, grouped by
 * gap alone. A zero belongs here at 13px. Giving it 27px of display scale
 * tells the reader a number matters when it does not, which is exactly how
 * four empty counters ended up leading half the product.
 */
export function FactList({ groups }: { groups: { cap?: ReactNode; rows: FactRow[] }[] }) {
  return (
    <dl className="sg-deflist">
      {groups.map((group, gi) => (
        <div className="sg-deflist__group" key={gi}>
          {group.cap ? <div className="sg-deflist__cap">{group.cap}</div> : null}
          {group.rows.map((row, ri) => (
            <div className="sg-deflist__row" key={ri}>
              <dt className="sg-deflist__term">
                {row.term}
                {row.note ? <div className="sg-deflist__note">{row.note}</div> : null}
              </dt>
              <dd className="sg-deflist__val" data-empty={row.empty ? "true" : undefined}>
                {row.value}
              </dd>
            </div>
          ))}
        </div>
      ))}
    </dl>
  );
}

export function MetaRail({ children }: { children: ReactNode }) {
  return <div className="sg-metarail">{children}</div>;
}

export function MetaGroup({ cap, children }: { cap?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {cap ? <div className="sg-metarail__cap">{cap}</div> : null}
      {children}
    </div>
  );
}

/**
 * An empty region that keeps its anatomy: what this surface is for, why it is
 * empty, and the single act that fills it. Never a shrug, never four zeros.
 */
export function Standing({
  icon,
  head,
  note,
  actions,
  center,
}: {
  icon?: ReactNode;
  head: ReactNode;
  note?: ReactNode;
  actions?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cx("sg-standing", center && "sg-standing--center")}>
      {icon ? <span className="sg-standing__icon">{icon}</span> : null}
      <div className="sg-standing__head">{head}</div>
      {note ? <p className="sg-standing__note">{note}</p> : null}
      {actions ? <div className="sg-standing__act">{actions}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- tile field */

export interface Tile {
  name: ReactNode;
  fact?: ReactNode;
  href?: string;
}

/**
 * The surface's anatomy as tiles: filled where there is data, drawn as a
 * dashed outline where there is not.
 *
 * This exists because a standing sentence on its own is not a composition. It
 * needs something to stand next to, and the honest something on a page with no
 * rows yet is the shape of the rows that are coming. `total` is padded up to a
 * multiple of the column count so the separator rules and the trailing fade
 * always resolve cleanly.
 */
export function TileField({
  tiles,
  total = 6,
  columns,
  fade = true,
  renderTile,
  caption,
}: {
  tiles: Tile[];
  total?: number;
  columns?: 2 | 3;
  fade?: boolean;
  renderTile?: (tile: Tile) => ReactNode;
  /**
   * What this field is waiting for, stated once, above the grid.
   *
   * A field of ghost tiles draws the anatomy and says nothing, so on an empty
   * Dependencies the only words on the surface were the ones in the band
   * overhead. That is how a paragraph of doctrine ended up in a ledger's
   * status line: it was the only place left to put it. With a caption here,
   * the band can go back to stating the condition alone.
   */
  caption?: ReactNode;
}) {
  const per = columns ?? 3;
  const slots = Math.max(total, Math.ceil(tiles.length / per) * per);
  const ghosts = Math.max(0, slots - tiles.length);

  const grid = (
    <div
      className={cx("sg-tiles", columns === 2 && "sg-tiles--2", fade && ghosts > 0 && "sg-tiles--fade")}
    >
      {tiles.map((tile, i) => {
        const body = renderTile ? (
          renderTile(tile)
        ) : (
          <>
            <span className="sg-tile__name">{tile.name}</span>
            {tile.fact ? <span className="sg-tile__fact">{tile.fact}</span> : null}
          </>
        );
        return (
          <div className="sg-tile" data-state="filled" key={i}>
            {body}
          </div>
        );
      })}
      {Array.from({ length: ghosts }, (_, i) => (
        <div className="sg-tile" data-state="ghost" key={`ghost-${i}`} aria-hidden>
          <span className="sg-tile__bar sg-tile__bar--id" />
          <span className="sg-tile__bar sg-tile__bar--sm" />
        </div>
      ))}
    </div>
  );

  if (!caption) return grid;
  return (
    <div className="sg-tilefield">
      <p className="sg-tilefield__caption">{caption}</p>
      {grid}
    </div>
  );
}
