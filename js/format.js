/* ============================================================
   YAC — input formatting helpers
   Pure string utilities + a caret-preserving live formatter.
   Digit-script aware: keeps whatever the user types (Western or
   Arabic-Indic ٠-٩) and only adds the matching group separator.
   Exposed as window.YAC.format; wired up in form.js.
   ============================================================ */
window.YAC = window.YAC || {};

window.YAC.format = (function () {
  const AR = '٠١٢٣٤٥٦٧٨٩';

  function isDigit(ch) { return (ch >= '0' && ch <= '9') || (ch >= '٠' && ch <= '٩'); }
  function countDigits(s) { let n = 0; for (let i = 0; i < s.length; i++) if (isDigit(s[i])) n++; return n; }
  function hasArabic(s) { return /[٠-٩]/.test(s); }
  function toWestern(s) { return String(s).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))); }

  /* "4500000" -> "4,500,000"  (or ٤٬٥٠٠٬٠٠٠ if typed in Arabic digits) */
  function groupAmount(raw) {
    const arabic = hasArabic(raw);
    let s = String(raw).replace(/[^\d٠-٩.]/g, '');       // digits (both scripts) + dot
    const dot = s.indexOf('.');
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    const parts = s.split('.');
    const int = parts[0] || '';
    const sep = arabic ? '٬' : ',';
    let g = '', c = 0;
    for (let i = int.length - 1; i >= 0; i--) {
      g = int[i] + g;
      if (++c % 3 === 0 && i > 0) g = sep + g;
    }
    let out = g;
    if (s.indexOf('.') !== -1) out += '.' + (parts[1] || '');
    return out;
  }

  /* keep a leading + plus digits/spaces; drop anything else (live) */
  function sanitizePhone(raw) {
    let s = String(raw).replace(/[^\d٠-٩+\s]/g, '');
    const plus = /^\s*\+/.test(s);
    s = s.replace(/\+/g, '');
    return (plus ? '+' : '') + s;
  }

  function group(str, sizes) {
    const out = []; let i = 0;
    for (const sz of sizes) { if (i >= str.length) break; out.push(str.slice(i, i + sz)); i += sz; }
    while (i < str.length) { out.push(str.slice(i, i + 4)); i += 4; }
    return out.filter(Boolean).join(' ');
  }

  /* tidy grouping on blur; Egyptian-aware, forgiving for anything else */
  function formatPhone(raw) {
    const hasPlus = /^\s*\+/.test(String(raw));
    const digits = String(raw).replace(/[^\d٠-٩]/g, '');
    if (!digits) return '';
    const w = toWestern(digits);
    if (w.startsWith('20') && w.length >= 11) return '+20 ' + group(digits.slice(2), [3, 3, 4]);
    if (w.startsWith('0') && w.length === 11) return group(digits, [3, 4, 4]);
    return (hasPlus ? '+' : '') + group(digits, [3, 3, 4]);
  }

  /* apply fn to el.value while keeping the caret at the same digit */
  function liveFormat(el, fn) {
    const raw = el.value;
    const caret = el.selectionStart == null ? raw.length : el.selectionStart;
    const before = countDigits(raw.slice(0, caret));
    const out = fn(raw);
    if (out === raw) return;
    el.value = out;
    let pos = 0, seen = 0;
    while (pos < out.length && seen < before) { if (isDigit(out[pos])) seen++; pos++; }
    try { el.setSelectionRange(pos, pos); } catch (_) {}
  }

  return { isDigit, countDigits, hasArabic, toWestern, groupAmount, sanitizePhone, formatPhone, liveFormat };
})();
