// Shows the theme switch in the manual's header (../v2/js/theme.js), once scripts can keep the
// reader's choice; the page's head already picked the theme before the first paint.
import { startThemeSwitch } from '../v2/js/theme.js';

startThemeSwitch(document.querySelector('.site-header'));
