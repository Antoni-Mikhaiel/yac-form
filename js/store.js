/* ============================================================
   YAC — data layer  (Convex-ready)
   ------------------------------------------------------------
   The rest of the app never talks to storage directly; it only
   calls YAC.store.*  So the backend lives entirely here.

   Backend selection:
     • If window.YAC.config.convexUrl is set (js/config.js), submissions
       go to your Convex deployment over its HTTP Actions URL (…​.convex.site).
     • Otherwise it falls back to browser localStorage, so the form stays
       fully functional locally until Convex is wired up.

   Convex has no SQL. The "table" is declared in convex/schema.ts and the
   API lives in convex/listings.ts + convex/http.ts. Convex also adds two
   system fields automatically: `_id` (the id) and `_creationTime` (ms).
   listListings() below normalizes those to id / created_at so the (future)
   admin page reads the same shape no matter which backend is active.

   ── LISTING SHAPE (must match convex/schema.ts) ─────────────
     lang, full_name, phone, whatsapp, email,
     operation, property_type, city, district, project, plot_number,
     area, bedrooms, bathrooms, floor, finishing, status,
     asking_price, negotiable, payment_method, down_payment,
     installment_period, installment_amount, monthly_rent, contract_duration,
     features (string[]), description,
     photos ([{ name, size, type, thumbnail }])
   Photos currently carry a small base64 thumbnail. To store full-resolution
   originals later, use Convex File Storage (generateUploadUrl) and keep a
   storageId per photo — see README.
   ============================================================ */
window.YAC = window.YAC || {};

window.YAC.store = (function () {
  const KEY = 'yac.listings';

  function convexBase() {
    const cfg = window.YAC.config || {};
    return (cfg.convexUrl || '').trim().replace(/\/+$/, '');
  }

  /* ---------------- localStorage fallback ---------------- */
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function readAll() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
    catch (_) { return []; }
  }
  function writeAll(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  /* ---------------- public API (all async) ---------------- */

  /** Persist one listing. Returns an object with an `id`. */
  async function saveListing(listing) {
    const base = convexBase();

    if (base) {
      let res;
      try {
        res = await fetch(base + '/submitListing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listing),
        });
      } catch (_) {
        throw new Error('network');
      }
      if (!res.ok) throw new Error('submit-failed');
      return await res.json(); // { id }
    }

    // fallback: localStorage
    const record = Object.assign({ id: uuid(), created_at: new Date().toISOString() }, listing);
    const all = readAll();
    all.push(record);
    try { writeAll(all); }
    catch (_) { throw new Error('storage-full'); }
    return record;
  }

  /** All listings, newest first — normalized to { id, created_at, ...fields }. */
  async function listListings() {
    const base = convexBase();
    if (base) {
      const res = await fetch(base + '/listings');
      if (!res.ok) throw new Error('list-failed');
      const rows = await res.json();
      return rows.map((r) => Object.assign({}, r, {
        id: r._id,
        created_at: new Date(r._creationTime).toISOString(),
      }));
    }
    return readAll().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  /** One listing by id. */
  async function getListing(id) {
    const base = convexBase();
    if (base) return (await listListings()).find((r) => r.id === id) || null;
    return readAll().find((r) => r.id === id) || null;
  }

  /** Remove one (admin housekeeping — localStorage only for now;
      a Convex delete mutation lands with the admin page). */
  async function deleteListing(id) {
    if (convexBase()) throw new Error('delete-not-wired');
    writeAll(readAll().filter((r) => r.id !== id));
  }

  return { saveListing, listListings, getListing, deleteListing };
})();
