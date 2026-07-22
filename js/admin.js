/* ============================================================
   YAC — Admin dashboard
   Reads listings through YAC.store (Convex on the live site, dev on
   localhost). Search / group-by / sort / detail / CSV export.

   ⚠️ The password below is a CLIENT-SIDE gate only. It keeps casual
   visitors out of the UI, but it does NOT secure the data: the
   /listings endpoint is public. For real protection, add Convex Auth
   on that route (see README) — then this becomes a proper login.
   ============================================================ */
(function () {
  const PASSWORD = '123abc';
  const SESSION_KEY = 'yac.admin.ok';

  /* code → human label maps */
  const LABELS = {
    operation:      { sale: 'Sale', rent: 'Rent' },
    property_type:  { apartment: 'Apartment', villa: 'Villa', townhouse: 'Townhouse', twinhouse: 'Twin house', penthouse: 'Penthouse', duplex: 'Duplex', retail: 'Retail shop', office: 'Office', clinic: 'Clinic', warehouse: 'Warehouse', land: 'Land', other: 'Other' },
    finishing:      { unfinished: 'Unfinished', semi: 'Semi-finished', full: 'Fully finished', superlux: 'Super lux', premium: 'Premium' },
    status:         { ready: 'Ready to move', resale: 'Resale', offplan: 'Under construction' },
    payment_method: { cash: 'Cash', install: 'Installments' },
    negotiable:     { yes: 'Yes', no: 'No' },
    features:       { openview: 'Open view', mainstreet: 'On a main street', garden: 'Garden', roof: 'Roof', furnished: 'Furnished', ac: 'Air-conditioned', garage: 'Garage', club: 'Clubhouse', security: 'Security & guarding', services: 'Near services', transport: 'Near transport' },
  };

  // [key, label, type?]  type = a LABELS map name, or 'money'
  const FIELDS = [
    ['full_name', 'Full name'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['email', 'Email'],
    ['operation', 'Transaction', 'operation'], ['property_type', 'Property type', 'property_type'],
    ['city', 'City'], ['district', 'District'], ['project', 'Project'], ['plot_number', 'Plot / building'],
    ['area', 'Area (m²)'], ['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms'], ['floor', 'Floor'],
    ['finishing', 'Finishing', 'finishing'], ['status', 'Status', 'status'],
    ['asking_price', 'Asking price', 'money'], ['negotiable', 'Negotiable', 'negotiable'],
    ['payment_method', 'Payment', 'payment_method'], ['down_payment', 'Down payment', 'money'],
    ['installment_period', 'Installment period'], ['installment_amount', 'Installment amount', 'money'],
    ['monthly_rent', 'Monthly rent', 'money'], ['contract_duration', 'Contract duration'],
  ];

  const F = window.YAC.format;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function label(type, code) {
    return (LABELS[type] && LABELS[type][code]) || code || '—';
  }
  function money(v) {
    if (v == null || v === '') return '';
    return (F ? F.groupAmount(String(v)) : String(v)) + ' EGP';
  }
  function refOf(r) { return 'YAC-' + String(r.id || r._id || '').slice(0, 8).toUpperCase(); }
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function west(s) { return F ? F.toWestern(String(s)) : String(s); }

  /* ---------- gate ---------- */
  const gate = document.getElementById('gate');
  const dash = document.getElementById('dash');
  const gateForm = document.getElementById('gateForm');
  const pw = document.getElementById('pw');
  const pwError = document.getElementById('pwError');

  gateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (pw.value === PASSWORD) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (_) {}
      unlock();
    } else {
      pwError.hidden = false;
      pw.value = '';
      pw.focus();
    }
  });

  function unlock() { gate.hidden = true; dash.hidden = false; load(); }
  function lock() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
    dash.hidden = true; gate.hidden = false; pwError.hidden = true; pw.value = ''; pw.focus();
  }

  /* ---------- data + rendering ---------- */
  let all = [];
  const search = document.getElementById('search');
  const groupBy = document.getElementById('groupBy');
  const sortBy = document.getElementById('sortBy');
  const results = document.getElementById('results');
  const countEl = document.getElementById('count');
  const statusEl = document.getElementById('status');

  async function load() {
    statusEl.textContent = 'Loading listings…';
    results.innerHTML = '';
    try {
      all = await window.YAC.store.listListings();
      statusEl.textContent = '';
      render();
    } catch (err) {
      statusEl.textContent = 'Could not load listings: ' + (err && err.message ? err.message : err);
    }
  }

  function haystack(r) {
    const parts = [
      refOf(r), r.full_name, r.phone, r.whatsapp, r.email, r.city, r.district, r.project,
      r.plot_number, r.floor, r.description, r.asking_price, r.monthly_rent, r.down_payment,
      label('operation', r.operation), label('property_type', r.property_type),
      label('finishing', r.finishing), label('status', r.status),
      (r.features || []).map((f) => label('features', f)).join(' '),
    ];
    return west(parts.filter(Boolean).join(' ').toLowerCase());
  }

  function sortRows(rows) {
    const by = sortBy.value;
    const arr = rows.slice();
    if (by === 'new') arr.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    else if (by === 'old') arr.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    else if (by === 'price') arr.sort((a, b) => num(b.asking_price) - num(a.asking_price));
    else if (by === 'area') arr.sort((a, b) => num(b.area) - num(a.area));
    return arr;
  }
  function num(v) { const n = parseFloat(west(String(v || '')).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }

  function render() {
    const q = west(search.value.trim().toLowerCase());
    let rows = q ? all.filter((r) => haystack(r).indexOf(q) !== -1) : all.slice();
    rows = sortRows(rows);

    countEl.textContent = rows.length + (rows.length === all.length ? '' : ' of ' + all.length) + ' listing' + (all.length === 1 ? '' : 's');
    results.innerHTML = '';

    if (!rows.length) {
      results.innerHTML = '<div class="empty"><strong>No listings found</strong>' +
        (all.length ? 'Try a different search or grouping.' : 'Submissions will appear here as they come in.') + '</div>';
      return;
    }

    const gb = groupBy.value;
    if (gb === 'none') {
      results.appendChild(renderCards(rows));
      return;
    }
    const groups = {};
    rows.forEach((r) => {
      const key = (r[gb] == null || r[gb] === '') ? '—' : r[gb];
      (groups[key] = groups[key] || []).push(r);
    });
    Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length).forEach((key) => {
      const sec = document.createElement('section');
      sec.className = 'group';
      const heading = LABELS[gb] ? label(gb, key) : key;
      sec.innerHTML = '<h2>' + esc(heading) + '<span class="gcount">' + groups[key].length + '</span></h2>';
      sec.appendChild(renderCards(groups[key]));
      results.appendChild(sec);
    });
  }

  function renderCards(rows) {
    const frag = document.createDocumentFragment();
    rows.forEach((r) => frag.appendChild(renderCard(r)));
    return frag;
  }

  function renderCard(r) {
    const d = document.createElement('details');
    d.className = 'card';

    const priceText = r.asking_price ? money(r.asking_price)
      : (r.monthly_rent ? money(r.monthly_rent) + '/mo' : '—');

    const summary = document.createElement('summary');
    summary.innerHTML =
      '<span class="ref">' + esc(refOf(r)) + '</span>' +
      '<span class="who"><strong>' + esc(r.full_name || '—') + '</strong><small>' + esc(r.phone || '') + '</small></span>' +
      '<span class="badge ' + esc(r.operation || '') + '">' + esc(label('operation', r.operation)) + '</span>' +
      '<span class="ptype">' + esc(label('property_type', r.property_type)) + '</span>' +
      '<span class="loc">' + esc([r.city, r.district].filter(Boolean).join(' · ')) + '</span>' +
      '<span class="price">' + esc(priceText) + '</span>' +
      '<span class="date">' + esc(fmtDate(r.created_at)) + '</span>';
    d.appendChild(summary);

    const detail = document.createElement('div');
    detail.className = 'detail';

    // field grid
    let rowsHtml = '';
    FIELDS.forEach(([key, lbl, type]) => {
      let v = r[key];
      if (v == null || v === '') return;
      if (type === 'money') v = money(v);
      else if (type) v = label(type, v);
      rowsHtml += '<div class="row"><span class="k">' + esc(lbl) + '</span><span class="v">' + esc(v) + '</span></div>';
    });
    detail.innerHTML = '<div class="dl">' + rowsHtml + '</div>';

    // features
    if (r.features && r.features.length) {
      detail.innerHTML += '<div class="chips">' +
        r.features.map((f) => '<span class="tag">' + esc(label('features', f)) + '</span>').join('') + '</div>';
    }
    // description
    if (r.description) {
      detail.innerHTML += '<div class="desc">' + esc(r.description) + '</div>';
    }
    // contacts
    const waDigits = west(String(r.whatsapp || r.phone || '')).replace(/[^0-9]/g, '');
    let contacts = '';
    if (r.phone) contacts += '<a class="ghost" href="tel:' + esc(r.phone) + '">Call</a>';
    if (waDigits) contacts += '<a class="ghost" href="https://wa.me/' + esc(waDigits) + '" target="_blank" rel="noopener">WhatsApp</a>';
    if (r.email) contacts += '<a class="ghost" href="mailto:' + esc(r.email) + '">Email</a>';
    if (contacts) detail.innerHTML += '<div class="contacts">' + contacts + '</div>';

    // photos (thumbnails)
    const photos = (r.photos || []).filter((p) => p && p.thumbnail);
    if (photos.length) {
      detail.innerHTML += '<div class="photos">' +
        photos.map((p) => '<img src="' + esc(p.thumbnail) + '" alt="' + esc(p.name || '') + '">').join('') + '</div>';
    }

    d.appendChild(detail);
    return d;
  }

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const q = west(search.value.trim().toLowerCase());
    let rows = q ? all.filter((r) => haystack(r).indexOf(q) !== -1) : all.slice();
    rows = sortRows(rows);

    const cols = [['ref', 'Reference'], ['created_at', 'Submitted']].concat(FIELDS.map(([k, l]) => [k, l]))
      .concat([['features', 'Features'], ['description', 'Description'], ['photos', 'Photos']]);

    const cell = (r, key) => {
      if (key === 'ref') return refOf(r);
      if (key === 'created_at') return fmtDate(r.created_at);
      if (key === 'features') return (r.features || []).map((f) => label('features', f)).join('; ');
      if (key === 'photos') return String((r.photos || []).length);
      const meta = FIELDS.find((f) => f[0] === key);
      let v = r[key];
      if (v == null) return '';
      if (meta && meta[2] === 'money') return west(String(v)).replace(/[^0-9.]/g, '');
      if (meta && meta[2]) return label(meta[2], v);
      return v;
    };
    const q2 = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const lines = [cols.map((c) => q2(c[1])).join(',')];
    rows.forEach((r) => lines.push(cols.map((c) => q2(cell(r, c[0]))).join(',')));

    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yac-listings-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- wiring ---------- */
  search.addEventListener('input', render);
  groupBy.addEventListener('change', render);
  sortBy.addEventListener('change', render);
  document.getElementById('refreshBtn').addEventListener('click', load);
  document.getElementById('logoutBtn').addEventListener('click', lock);
  document.getElementById('exportBtn').addEventListener('click', exportCsv);

  // expose a couple of internals for headless testing
  window.YAC.admin = { render, get data() { return all; }, set data(v) { all = v; } };

  // already unlocked this session?
  let ok = false;
  try { ok = sessionStorage.getItem(SESSION_KEY) === '1'; } catch (_) {}
  if (ok) unlock();
})();
