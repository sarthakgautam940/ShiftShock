import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Menu, applyTheme, type ThemeChoice } from "../../kit";

const CHOICES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Match system", icon: Monitor },
  { value: "paper", label: "Light", icon: Sun },
  { value: "night", label: "Dark", icon: Moon },
];

function currentTheme(): ThemeChoice {
  const value = document.documentElement.dataset.theme;
  return value === "paper" || value === "night" ? value : "system";
}

/** The palette can change the theme too, so the menu listens for it. */
export const THEME_EVENT = "md:theme";

export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  window.dispatchEvent(new CustomEvent(THEME_EVENT));
}

export function ThemeMenu() {
  const [theme, setThemeState] = useState<ThemeChoice>(currentTheme);
  useEffect(() => {
    const sync = () => setThemeState(currentTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const Icon = CHOICES.find((c) => c.value === theme)?.icon ?? Monitor;

  return (
    <Menu
      label="Theme"
      triggerClassName="sg-iconbtn"
      triggerTitle="Theme"
      minWidth={180}
      trigger={<Icon size={16} aria-hidden />}
    >
      {(close) =>
        CHOICES.map((choice) => {
          const ChoiceIcon = choice.icon;
          return (
            <button
              key={choice.value}
              type="button"
              className="sg-menu-item"
              role="menuitem"
              aria-current={choice.value === theme ? "true" : undefined}
              onClick={() => {
                setTheme(choice.value);
                close();
              }}
            >
              <ChoiceIcon size={15} aria-hidden />
              {choice.label}
              {choice.value === theme ? (
                <Check size={14} style={{ marginLeft: "auto", color: "var(--accent)" }} aria-hidden />
              ) : null}
            </button>
          );
        })
      }
    </Menu>
  );
}
