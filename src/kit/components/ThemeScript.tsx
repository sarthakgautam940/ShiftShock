/**
 * Stamps the persisted theme on <html> before first paint so neither theme
 * ever flashes. Paper is the default; "system" follows the OS via the media
 * query in tokens.css. Persisted per user in Account -> Appearance (§3.1).
 */

export const THEME_STORAGE_KEY = "sg-theme";
export const MOTION_STORAGE_KEY = "sg-motion";
export const CONTRAST_STORAGE_KEY = "sg-contrast";
export const VISION_STORAGE_KEY = "sg-vision";
export const TEXTSIZE_STORAGE_KEY = "sg-textsize";

export type MotionChoice = "system" | "reduced";
export type ThemeChoice = "paper" | "night" | "system";
export type ContrastChoice = "system" | "high";
/** One palette, not three. See tokens.css for why. */
export type VisionChoice = "default" | "cvd";
export type TextSizeChoice = "default" | "large" | "larger";

/**
 * Every preference is stamped before first paint.
 *
 * A preference applied after hydration is a preference the user watches fail
 * for a frame: the wrong theme flashes, text jumps a size. So all five are read
 * from storage and written to <html> in one synchronous script, and each one
 * falls back to a safe value rather than throwing.
 */
/**
 * Exported because the app renders this under a CSP nonce and therefore needs
 * the source, not the component. It previously kept its own copy of this
 * script inline in the root layout, and that copy stamped the theme alone: a
 * user's contrast, colour-vision, text-size and motion choices were applied
 * when they changed them and then silently lost on the next page load. One
 * script, one place, is the fix; two copies is what caused it.
 */
export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;function g(k,v,f){try{var x=localStorage.getItem(k);return v.indexOf(x)>-1?x:f}catch(e){return f}}
d.dataset.theme=g("${THEME_STORAGE_KEY}",["paper","night","system"],"system");
if(g("${MOTION_STORAGE_KEY}",["reduced"],"")==="reduced")d.dataset.motion="reduced";
if(g("${CONTRAST_STORAGE_KEY}",["high"],"")==="high")d.dataset.contrast="high";
if(g("${VISION_STORAGE_KEY}",["cvd"],"")==="cvd")d.dataset.vision="cvd";
var s=g("${TEXTSIZE_STORAGE_KEY}",["large","larger"],"");if(s)d.dataset.textsize=s;})();`;

const SCRIPT = THEME_BOOT_SCRIPT;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

/** Writes a preference to <html> and remembers it. Absent = the default. */
function set(attr: string, key: string, value: string, isDefault: boolean): void {
  if (isDefault) delete document.documentElement.dataset[attr];
  else document.documentElement.dataset[attr] = value;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): the choice lasts for the session.
  }
}

export function applyMotion(motion: MotionChoice): void {
  set("motion", MOTION_STORAGE_KEY, motion, motion === "system");
}

export function applyTheme(theme: ThemeChoice): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode): the choice lasts for the session.
  }
}

export function applyContrast(contrast: ContrastChoice): void {
  set("contrast", CONTRAST_STORAGE_KEY, contrast, contrast === "system");
}

export function applyVision(vision: VisionChoice): void {
  set("vision", VISION_STORAGE_KEY, vision, vision === "default");
}

export function applyTextSize(size: TextSizeChoice): void {
  set("textsize", TEXTSIZE_STORAGE_KEY, size, size === "default");
}
