// The page's theme, Standard or Sketch (themes.css): the page's head picks it before the first
// paint and marks it on the root as data-theme; the switch in the header changes it, keeps the
// choice for the next visit and tells the drawing with a `themechange` event on window. The page's
// head puts in each theme's own stills (index.html).

const KEY = 'headwire-theme';
const root = document.documentElement;

/** The theme the page shows now: 'standard' or 'sketch'. */
export const currentTheme = () => (root.dataset.theme === 'sketch' ? 'sketch' : 'standard');

/** Shows `name` and keeps it, where the browser lets the page keep anything. */
export function setTheme(name) {
    if (name === currentTheme()) return;
    root.dataset.theme = name;
    try {
        localStorage.setItem(KEY, name);
    } catch {}
    dispatchEvent(new CustomEvent('themechange', { detail: name }));
}

/** Shows the switch in `header`, set to the theme the page shows. */
export function startThemeSwitch(header) {
    const control = header?.querySelector('.theme-switch');
    if (!control) return;
    for (const input of control.querySelectorAll('input')) {
        input.checked = input.value === currentTheme();
        input.addEventListener('change', () => input.checked && setTheme(input.value));
    }
    control.hidden = false;
}
