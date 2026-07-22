/* ============================================================
   YAC — i18n / RTL engine
   ------------------------------------------------------------
   Translations live next to the markup as data-* attributes:
     data-en / data-ar         -> element text
     data-ph-en / data-ph-ar   -> input/textarea placeholder
     data-html (flag)          -> value may contain trusted markup
                                  (e.g. the hero <em>); rendered
                                  with innerHTML. Everything else
                                  uses textContent (no injection).

   Other modules react to language changes via YAC.i18n.onChange().
   Exposed as a global (classic script) so the whole thing runs by
   just opening index.html — no build step, no module server.
   ============================================================ */
window.YAC = window.YAC || {};

window.YAC.i18n = (function () {
  const STORAGE_KEY = 'yac.lang';
  const listeners = [];
  const state = { lang: 'en' };

  const TITLES = {
    en: 'YAC — Property Listing',
    ar: 'YAC — تسجيل وحدة عقارية',
  };

  function apply(lang) {
    if (lang !== 'ar' && lang !== 'en') lang = 'en';
    const rtl = lang === 'ar';
    const html = document.documentElement;

    html.lang = lang;
    html.dir = rtl ? 'rtl' : 'ltr';

    // Text nodes -------------------------------------------------
    document.querySelectorAll('[data-en]').forEach((el) => {
      const value = el.getAttribute('data-' + lang);
      if (value === null) return;
      if (el.hasAttribute('data-html')) {
        el.innerHTML = value;      // trusted, author-controlled markup only
      } else {
        el.textContent = value;    // safe default
      }
    });

    // Placeholders ----------------------------------------------
    document.querySelectorAll('[data-ph-en]').forEach((el) => {
      const value = el.getAttribute('data-ph-' + lang);
      if (value !== null) el.placeholder = value;
    });

    document.title = TITLES[lang];

    // Language toggle button reflects the *other* language -------
    const cur = document.getElementById('langCur');
    const alt = document.getElementById('langAlt');
    if (cur && alt) {
      if (rtl) { cur.textContent = 'English'; alt.textContent = '/ ع'; }
      else     { cur.textContent = 'العربية'; alt.textContent = '/ EN'; }
    }

    state.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}

    listeners.forEach((fn) => { try { fn(lang); } catch (_) {} });
  }

  function toggle() {
    apply(state.lang === 'ar' ? 'en' : 'ar');
  }

  /* Pick a localized string at runtime (used by form.js for
     validation messages that aren't in the DOM). */
  function t(dict) {
    return dict[state.lang] != null ? dict[state.lang] : dict.en;
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function init() {
    const btn = document.getElementById('langBtn');
    if (btn) btn.addEventListener('click', toggle);

    let initial = 'en';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'en') initial = saved;
    } catch (_) {}
    apply(initial);
  }

  return {
    init,
    apply,
    toggle,
    onChange,
    t,
    get lang() { return state.lang; },
  };
})();

document.addEventListener('DOMContentLoaded', window.YAC.i18n.init);
