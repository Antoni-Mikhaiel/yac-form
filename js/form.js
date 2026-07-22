/* ============================================================
   YAC — form controller
   Validation (bilingual), conditional sections, photo uploads,
   and submit -> YAC.store.  Classic script; no build step.
   ============================================================ */
(function () {
  const i18n = window.YAC.i18n;
  const store = window.YAC.store;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const form = document.getElementById('listingForm');
    if (!form) return;

    /* ---------- refs ---------- */
    const installBlock = document.getElementById('installBlock');
    const rentBlock = document.getElementById('rentBlock');
    const drop = document.getElementById('drop');
    const fileInput = document.getElementById('fileInput');
    const thumbs = document.getElementById('thumbs');
    const uploadNote = document.getElementById('uploadNote');
    const sendBtn = form.querySelector('button.send');
    const successPanel = document.getElementById('successPanel');
    const successRef = document.getElementById('successRef');

    let attempted = false;      // become chatty only after first submit
    let errors = {};            // name -> message key
    let photos = [];            // { file, url }
    const MAX_PHOTOS = 10;

    /* ---------- localized validation messages ---------- */
    const MSG = {
      required:       { en: 'This field is required.',            ar: 'هذا الحقل مطلوب.' },
      requiredChoice: { en: 'Please choose an option.',           ar: 'برجاء اختيار أحد الخيارات.' },
      email:          { en: 'Enter a valid email address.',       ar: 'برجاء إدخال بريد إلكتروني صحيح.' },
      phone:          { en: 'Enter a valid phone number.',        ar: 'برجاء إدخال رقم هاتف صحيح.' },
      number:         { en: 'Enter a valid number.',              ar: 'برجاء إدخال رقم صحيح.' },
      positive:       { en: 'Enter a value greater than 0.',      ar: 'برجاء إدخال قيمة أكبر من صفر.' },
      price:          { en: 'Enter a valid amount.',              ar: 'برجاء إدخال مبلغ صحيح.' },
      minlen:         { en: 'Please enter at least 2 characters.', ar: 'برجاء إدخال حرفين على الأقل.' },
      consent:        { en: 'You must agree before submitting.',  ar: 'يجب الموافقة قبل الإرسال.' },
    };

    const isSale = () => fieldValue('operation') === 'sale';
    const isRent = () => fieldValue('operation') === 'rent';

    /* ---------- validation rules (order = focus order) ---------- */
    const RULES = [
      { name: 'fullName', required: true, min: 2 },
      { name: 'phone',    required: true, kind: 'phone' },
      { name: 'whatsapp', required: true, kind: 'phone' },
      { name: 'email',    kind: 'email' },
      { name: 'operation', required: true, kind: 'choice' },
      { name: 'ptype',     required: true, kind: 'choice' },
      { name: 'city',     required: true },
      { name: 'district', required: true },
      { name: 'area',     required: true, kind: 'number', gt: 0 },
      { name: 'finish',   required: true, kind: 'choice' },
      { name: 'status',   required: true, kind: 'choice' },
      { name: 'askingPrice', requiredIf: isSale, kind: 'price' },
      { name: 'pay',      requiredIf: isSale, kind: 'choice' },
      { name: 'monthlyRent', requiredIf: isRent, kind: 'price' },
      { name: 'consent',  required: true, kind: 'consent' },
    ];

    /* ============================================================
       value helpers
       ============================================================ */
    function fieldValue(name) {
      const el = form.elements[name];
      if (!el) return '';
      if (el.tagName === undefined) return el.value || '';   // RadioNodeList
      if (el.type === 'checkbox') return el.checked ? (el.value || 'on') : '';
      return (el.value || '').trim();
    }

    function featureValues() {
      return Array.prototype.map.call(
        form.querySelectorAll('input[name="feat"]:checked'), (c) => c.value);
    }

    function normalizeDigits(s) {
      return String(s)
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))  // Arabic-Indic
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0)); // Extended
    }
    function toNumber(s) {
      const cleaned = normalizeDigits(s).replace(/[^0-9.]/g, '');
      if (cleaned === '') return null;
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    }
    function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
    function isPhone(s) {
      const digits = normalizeDigits(s).replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15;
    }

    /* ============================================================
       validation
       ============================================================ */
    function validate() {
      errors = {};
      for (const r of RULES) {
        const req = r.required || (r.requiredIf && r.requiredIf());
        const val = fieldValue(r.name);

        if (!val) {
          if (req) {
            errors[r.name] = r.kind === 'choice' ? 'requiredChoice'
              : r.kind === 'consent' ? 'consent'
              : 'required';
          }
          continue;
        }
        if (r.min && val.length < r.min) { errors[r.name] = 'minlen'; continue; }
        if (r.kind === 'email' && !isEmail(val)) { errors[r.name] = 'email'; continue; }
        if (r.kind === 'phone' && !isPhone(val)) { errors[r.name] = 'phone'; continue; }
        if (r.kind === 'number') {
          const n = toNumber(val);
          if (n === null) { errors[r.name] = 'number'; continue; }
          if (r.gt != null && !(n > r.gt)) { errors[r.name] = 'positive'; continue; }
        }
        if (r.kind === 'price') {
          const n = toNumber(val);
          if (n === null || !(n > 0)) { errors[r.name] = 'price'; continue; }
        }
      }
      return Object.keys(errors).length === 0;
    }

    function getContainer(name) {
      const el = form.querySelector('[name="' + name + '"]');
      if (!el) return null;
      if (name === 'consent') return el.closest('.consent-wrap');
      return el.closest('.field') || el.closest('fieldset');
    }

    function ensureErrorEl(container, name) {
      let e = container.querySelector(':scope > .error-msg');
      if (!e) {
        e = document.createElement('span');
        e.className = 'error-msg';
        e.id = 'err-' + name;
        e.setAttribute('role', 'alert');
        container.appendChild(e);
      }
      return e;
    }

    function renderErrors() {
      // reset previous state
      form.querySelectorAll('.invalid').forEach((c) => c.classList.remove('invalid'));
      form.querySelectorAll('[aria-invalid]').forEach((el) => {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      });

      Object.keys(errors).forEach((name) => {
        const container = getContainer(name);
        if (!container) return;
        container.classList.add('invalid');
        const errEl = ensureErrorEl(container, name);
        errEl.textContent = i18n.t(MSG[errors[name]]);
        const control = form.querySelector('[name="' + name + '"]');
        if (control) {
          control.setAttribute('aria-invalid', 'true');
          control.setAttribute('aria-describedby', errEl.id);
        }
      });
    }

    function focusFirstError() {
      const first = RULES.find((r) => errors[r.name]);
      if (!first) return;
      const control = form.querySelector('[name="' + first.name + '"]');
      if (control) {
        control.focus({ preventScroll: true });
        (getContainer(first.name) || control).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    /* ============================================================
       conditional sections + conditional-required markers
       ============================================================ */
    function toggleReq(name, on) {
      const c = getContainer(name);
      const req = c && c.querySelector('.req');
      if (req) req.hidden = !on;
    }

    function refreshConditionals() {
      const pay = fieldValue('pay');
      const op = fieldValue('operation');
      installBlock.classList.toggle('show', pay === 'install');
      rentBlock.classList.toggle('show', op === 'rent');
      // asking price + payment apply to sales; monthly rent to rentals
      toggleReq('askingPrice', op === 'sale');
      toggleReq('pay', op === 'sale');
      toggleReq('monthlyRent', op === 'rent');
    }

    /* ============================================================
       photo uploads
       ============================================================ */
    const ACCEPTED = /^image\/(jpeg|png|webp)$/;

    function addFiles(fileList) {
      const incoming = Array.prototype.filter.call(fileList, (f) => ACCEPTED.test(f.type));
      let added = 0;
      for (const f of incoming) {
        if (photos.length >= MAX_PHOTOS) break;
        photos.push({ file: f, url: URL.createObjectURL(f) });
        added++;
      }
      renderThumbs();
      const capped = photos.length >= MAX_PHOTOS && added < incoming.length;
      const rejected = fileList.length - incoming.length;
      refreshCountNote({ capped, rejected });
    }

    function arDigits(n) {
      return String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
    }

    // Live feedback under the drop zone — confirms multiple were added at once.
    function refreshCountNote(opts) {
      const capped = opts && opts.capped;
      const rejected = (opts && opts.rejected) || 0;
      const n = photos.length;
      let dict = null;
      if (capped) {
        dict = { en: 'Maximum reached — 10 of 10 photos.', ar: 'الحد الأقصى — ١٠ من ١٠ صور.' };
      } else if (rejected > 0) {
        dict = {
          en: n + ' of 10 added · some files skipped (JPG, PNG or WebP only).',
          ar: arDigits(n) + ' من ١٠ · تم تجاهل بعض الملفات (JPG أو PNG أو WebP فقط).',
        };
      } else if (n > 0) {
        dict = { en: n + ' of 10 photos selected.', ar: arDigits(n) + ' من ١٠ صور.' };
      }
      setNote(dict);
    }

    function setNote(dict) {
      if (!uploadNote) return;
      uploadNote._dict = dict;
      uploadNote.textContent = dict ? i18n.t(dict) : '';
    }

    function renderThumbs() {
      thumbs.innerHTML = '';
      photos.forEach((p, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'thumb-wrap';

        const img = document.createElement('img');
        img.className = 'thumb';
        img.src = p.url;
        img.alt = '';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'thumb-remove';
        btn.textContent = '×';
        btn.setAttribute('aria-label', i18n.t({ en: 'Remove photo', ar: 'حذف الصورة' }));
        btn.addEventListener('click', () => {
          URL.revokeObjectURL(p.url);
          photos.splice(i, 1);
          renderThumbs();
          refreshCountNote();
        });

        wrap.appendChild(img);
        wrap.appendChild(btn);
        thumbs.appendChild(wrap);
      });
    }

    // Downscale to a small JPEG thumbnail so previews fit in storage.
    function makeThumb(file) {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const MAX = 320;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          let data = null;
          try { data = canvas.toDataURL('image/jpeg', 0.6); } catch (_) {}
          resolve(data);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    }

    async function photosPayload() {
      const out = [];
      for (const p of photos) {
        out.push({
          name: p.file.name,
          size: p.file.size,
          type: p.file.type,
          thumbnail: await makeThumb(p.file),
        });
      }
      return out;
    }

    /* ============================================================
       collect + submit
       ============================================================ */
    function orNull(name) { return fieldValue(name) || null; }
    function numOrNull(name) {
      const v = fieldValue(name);
      return v ? toNumber(v) : null;
    }
    // money is stored as clean digits (strip grouping) so the admin can
    // sort / filter by amount; the display keeps the grouped version.
    function moneyOrNull(name) {
      const v = fieldValue(name);
      if (!v) return null;
      const n = toNumber(v);
      return n === null ? v : String(n);
    }

    function collect() {
      return {
        lang: i18n.lang,
        full_name: fieldValue('fullName'),
        phone: fieldValue('phone'),
        whatsapp: fieldValue('whatsapp'),
        email: orNull('email'),
        operation: fieldValue('operation'),
        property_type: fieldValue('ptype'),
        city: fieldValue('city'),
        district: fieldValue('district'),
        project: orNull('project'),
        plot_number: orNull('plotNumber'),
        area: numOrNull('area'),
        bedrooms: numOrNull('bedrooms'),
        bathrooms: numOrNull('bathrooms'),
        floor: orNull('floor'),
        finishing: fieldValue('finish'),
        status: fieldValue('status'),
        asking_price: moneyOrNull('askingPrice'),
        negotiable: orNull('nego'),
        payment_method: orNull('pay'),
        down_payment: moneyOrNull('downPayment'),
        installment_period: orNull('installmentPeriod'),
        installment_amount: moneyOrNull('installmentAmount'),
        monthly_rent: moneyOrNull('monthlyRent'),
        contract_duration: orNull('contractDuration'),
        features: featureValues(),
        description: orNull('description'),
        photos: [],
      };
    }

    async function onSubmit(e) {
      e.preventDefault();
      attempted = true;

      if (!validate()) {
        renderErrors();
        focusFirstError();
        return;
      }
      renderErrors(); // clears any stale messages

      sendBtn.disabled = true;
      try {
        const listing = collect();
        listing.photos = await photosPayload();
        const saved = await store.saveListing(listing);
        showSuccess(saved);
      } catch (err) {
        sendBtn.disabled = false;
        const dict = err && err.message === 'storage-full'
          ? { en: 'Storage is full — remove some photos and try again.', ar: 'مساحة التخزين ممتلئة — احذف بعض الصور وحاول مجدداً.' }
          : { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ ما. برجاء المحاولة مرة أخرى.' };
        alert(i18n.t(dict));
      }
    }

    function showSuccess(saved) {
      const ref = 'YAC-' + String(saved.id).slice(0, 8).toUpperCase();
      if (successRef) successRef.textContent = ref;
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // free object URLs; a fresh submission starts clean via reload
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      photos = [];
    }

    /* ============================================================
       wiring
       ============================================================ */
    form.addEventListener('submit', onSubmit);

    // conditional sections react to the two driving choices
    form.querySelectorAll('input[name="pay"], input[name="operation"]')
      .forEach((r) => r.addEventListener('change', refreshConditionals));

    // once the user has tried to submit, validate live so errors clear as they fix
    form.addEventListener('input', () => { if (attempted) { validate(); renderErrors(); } });
    form.addEventListener('change', () => { if (attempted) { validate(); renderErrors(); } });

    // uploads
    fileInput.addEventListener('change', (e) => {
      addFiles(e.target.files);
      fileInput.value = ''; // allow re-selecting the same file
    });
    ['dragover', 'dragenter'].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); }));
    ['dragleave', 'dragend'].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); }));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });

    // "submit another" — reload keeps the chosen language (persisted)
    const again = document.getElementById('submitAnother');
    if (again) again.addEventListener('click', () => location.reload());

    /* ---------- input formatting + small conveniences ---------- */
    const F = window.YAC.format;

    // live thousands-grouping for money + area
    ['askingPrice', 'downPayment', 'installmentAmount', 'monthlyRent', 'area'].forEach((name) => {
      const el = form.elements[name];
      if (el && F) el.addEventListener('input', () => F.liveFormat(el, F.groupAmount));
    });
    // integers only for room counts
    ['bedrooms', 'bathrooms'].forEach((name) => {
      const el = form.elements[name];
      if (el && F) el.addEventListener('input', () => F.liveFormat(el, (s) => s.replace(/[^\d٠-٩]/g, '')));
    });

    // phone + whatsapp: sanitize while typing, tidy grouping on blur
    const phoneEl = form.elements['phone'];
    const waEl = form.elements['whatsapp'];
    const waSame = document.getElementById('waSame');
    [phoneEl, waEl].forEach((el) => {
      if (!el || !F) return;
      el.addEventListener('input', () => { if (!el.readOnly) F.liveFormat(el, F.sanitizePhone); });
      el.addEventListener('blur', () => {
        if (el.readOnly) return;
        el.value = F.formatPhone(el.value);
        if (waSame && waSame.checked && el === phoneEl && waEl) waEl.value = el.value;
        if (attempted) { validate(); renderErrors(); }
      });
    });

    // WhatsApp "same as phone" — mirror + lock
    function syncWa() {
      if (!waSame || !waEl || !phoneEl) return;
      if (waSame.checked) { waEl.value = phoneEl.value; waEl.readOnly = true; }
      else { waEl.readOnly = false; }
      if (attempted) { validate(); renderErrors(); }
    }
    if (waSame && phoneEl && waEl) {
      waSame.addEventListener('change', syncWa);
      phoneEl.addEventListener('input', () => { if (waSame.checked) waEl.value = phoneEl.value; });
    }

    // description character counter
    const descEl = form.elements['description'];
    const descCount = document.getElementById('descCount');
    function updateCount() {
      if (!descEl || !descCount) return;
      const max = parseInt(descEl.getAttribute('maxlength'), 10) || 1200;
      const left = max - descEl.value.length;
      descCount.textContent = i18n.lang === 'ar'
        ? arDigits(left) + ' حرف متبقٍ'
        : left + ' characters left';
    }
    if (descEl) { descEl.addEventListener('input', updateCount); updateCount(); }

    // re-translate live text (errors, thumb labels, upload note, counter) on toggle
    i18n.onChange(() => {
      if (attempted) renderErrors();
      renderThumbs();
      if (uploadNote && uploadNote._dict) setNote(uploadNote._dict);
      updateCount();
    });

    refreshConditionals();
  }
})();
