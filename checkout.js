/* =========================================================
   KIJANI KILO | CHECKOUT
   Needs products.js (prices, promo codes) and payments.js (payment bridge).
   The crate comes from the shop page (saved in the browser).
   ========================================================= */
(() => {
  'use strict';

  const FREE_FROM = 2000;      // free delivery above this subtotal (KES), same as the shop page
  const DELIVERY_FEE = 150;

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const drop = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const kes = (n) => 'KES ' + Math.round(n).toLocaleString('en-KE');
  const num = (n) => String(+Number(n).toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catById = new Map(KK_CATEGORIES.map((c) => [c.id, c]));
  const byId = new Map(KK_PRODUCTS.map((p) => [p.id, p]));
  const isBasket = (p) => catById.get(p.cat).unit === 'basket';
  const qtyText = (p, q) => (isBasket(p) ? `${num(q)} ${q === 1 ? 'basket' : 'baskets'}` : `${num(q)} kg`);

  const METHODS = {
    mpesa:  { name: 'M-Pesa',       pay: 'with M-Pesa' },
    airtel: { name: 'Airtel Money', pay: 'with Airtel Money' },
    card:   { name: 'Bank card',    pay: 'by card' },
    paypal: { name: 'PayPal',       pay: 'with PayPal' }
  };

  /* ---------- State ---------- */
  let crate = load('kk_crate', {});
  Object.keys(crate).forEach((id) => { if (!byId.has(id)) delete crate[id]; });
  let promoCode = load('kk_promo', '');
  const st = { method: 'mpesa', mode: 'delivery', slot: '', paid: null, snapshot: null };

  const orderId = (() => {
    try {
      let id = sessionStorage.getItem('kk_order_id');
      if (!id) { id = 'KK-' + Math.floor(10000 + Math.random() * 90000); sessionStorage.setItem('kk_order_id', id); }
      return id;
    } catch (e) { return 'KK-' + Math.floor(10000 + Math.random() * 90000); }
  })();
  $$('.orderRef').forEach((el) => { el.textContent = orderId; });

  /* ---------- Money ---------- */
  const lines = () => (st.snapshot || Object.keys(crate).map((id) => ({ p: byId.get(id), q: crate[id] })));
  function totals() {
    const ls = lines();
    const sub = ls.reduce((s, l) => s + l.p.price * l.q, 0);
    const promo = promoCode ? KK_checkPromo(promoCode, sub) : null;
    const discount = promo && promo.ok ? Math.min(promo.discount, sub) : 0;
    const net = sub - discount;
    const pickup = st.mode === 'pickup';
    const delivery = sub === 0 || pickup ? 0 : ((net >= FREE_FROM || (promo && promo.ok && promo.freeDelivery)) ? 0 : DELIVERY_FEE);
    return { ls, sub, promo, discount, delivery, total: net + delivery, pickup };
  }

  /* ---------- Delivery times ---------- */
  const SLOTS = [
    { id: 'today-eve', label: 'Today, evening', time: '4 pm to 7 pm', today: true },
    { id: 'tom-morn', label: 'Tomorrow, morning', time: '8 am to 11 am' },
    { id: 'tom-aft', label: 'Tomorrow, afternoon', time: '12 pm to 3 pm' }
  ];
  const nairobiHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  function buildSlots() {
    const late = nairobiHour() >= 14;                       // same-day delivery needs an order before 2 pm
    const list = SLOTS.map((s) => ({ ...s, off: s.today && late }));
    if (!st.slot || list.find((s) => s.id === st.slot && s.off)) st.slot = (list.find((s) => !s.off) || list[0]).id;
    $('#slotGrid').innerHTML = list.map((s) => `
      <label class="slot${s.off ? ' off' : ''}">
        <input type="radio" name="slot" value="${s.id}" ${s.id === st.slot ? 'checked' : ''} ${s.off ? 'disabled' : ''}>
        <span><b>${s.label}</b><small>${s.off ? 'Order before 2 pm for same day' : s.time}</small></span>
      </label>`).join('');
  }
  const slotText = () => { const s = SLOTS.find((x) => x.id === st.slot); return s ? `${s.label}, ${s.time}` : ''; };

  /* ---------- Validation ---------- */
  const phoneOk = (v) => /^(?:\+254|254|0)(?:7|1)\d{8}$/.test(String(v).replace(/[\s-]/g, ''));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  const luhn = (num) => { let s = 0, alt = false; for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
  const brandOf = (n) => (/^4/.test(n) ? 'visa' : /^(5[1-5]|2[2-7])/.test(n) ? 'mastercard' : /^3[47]/.test(n) ? 'amex' : '');

  const RULES = {
    cName:   (v) => (v.trim().length >= 3 ? '' : 'Enter your full name.'),
    cPhone:  (v) => (phoneOk(v) ? '' : 'Phone number should start with 07 or 01 and have 10 digits.'),
    cEmail:  (v) => (!v.trim() || emailOk(v) ? '' : 'Enter a valid email, or leave it empty.'),
    cCounty: (v) => (v ? '' : 'Choose your town or county.'),
    cArea:   (v) => (v.trim().length >= 3 ? '' : 'Tell us your area or estate.'),
    mpPhone: (v) => (phoneOk(v) ? '' : 'Enter the M-Pesa number to charge (07XXXXXXXX).'),
    arPhone: (v) => (phoneOk(v) ? '' : 'Enter the Airtel Money number to charge.'),
    ccNumber: (v) => { const n = v.replace(/\s/g, ''); return n.length >= 13 && n.length <= 19 && luhn(n) ? '' : 'That card number does not look right.'; },
    ccName:  (v) => (v.trim().length >= 3 ? '' : 'Enter the name on the card.'),
    ccExp:   (v) => {
      const m = v.replace(/\s/g, '').match(/^(\d{2})\/(\d{2})$/);
      if (!m) return 'Use MM / YY.';
      const mm = +m[1], yy = 2000 + +m[2], now = new Date();
      if (mm < 1 || mm > 12) return 'That month is not valid.';
      return (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1)) ? '' : 'This card has expired.';
    },
    ccCvv:   (v) => (new RegExp(`^\\d{${brandOf($('#ccNumber').value.replace(/\s/g, '')) === 'amex' ? 4 : 3}}$`).test(v) ? '' : 'Enter the 3 digit code on the back.'),
    cTerms:  () => ($('#cTerms').checked ? '' : 'Please accept the terms to continue.')
  };

  const showErr = (id, msg) => {
    const el = document.getElementById(id), out = document.getElementById(id + '-err');
    if (out) out.textContent = msg;
    if (el) el.setAttribute('aria-invalid', String(Boolean(msg)));
  };
  const check = (id) => { const el = document.getElementById(id); const m = RULES[id](el.type === 'checkbox' ? '' : el.value); showErr(id, m); return !m; };
  const silent = (id) => !RULES[id](document.getElementById(id).value);

  const idsFor = () => {
    const ids = ['cName', 'cPhone', 'cEmail'];
    if (st.mode === 'delivery') ids.push('cCounty', 'cArea');
    return ids;
  };
  const methodIds = () => ({ mpesa: ['mpPhone'], airtel: ['arPhone'], card: ['ccNumber', 'ccName', 'ccExp', 'ccCvv'], paypal: [] }[st.method]);

  function updateSteps() {
    const detailsOk = idsFor().every(silent);
    $('#stepDetails').className = st.paid ? 'is-done' : (detailsOk ? 'is-done' : 'is-on');
    $('#stepPay').className = st.paid ? 'is-done' : (detailsOk ? 'is-on' : '');
    $('#stepDone').className = st.paid ? 'is-on' : '';
  }


  /* =========================================================
     Receipt (updates as the customer types)
     ========================================================= */
  const flash = (el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  const setText = (id, text, placeholder) => {
    const el = document.getElementById(id);
    const v = text && String(text).trim() ? text : placeholder;
    if (el.textContent !== v) { el.textContent = v; flash(el); }
    el.classList.toggle('muted', !(text && String(text).trim()));
  };

  function renderReceipt() {
    const t = totals();
    $('#rcDate').textContent = new Date().toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    setText('rcName', $('#cName').value, 'Your name');
    setText('rcPhone', $('#cPhone').value, 'Your phone');
    if (t.pickup) {
      $('#rcWhereLabel').textContent = 'Pick up at';
      setText('rcWhere', 'KCA University Town Campus, Monrovia Plaza, Nairobi', '');
    } else {
      $('#rcWhereLabel').textContent = 'Deliver to';
      const where = [$('#cLandmark').value.trim(), $('#cArea').value.trim(), $('#cCounty').value].filter(Boolean).join(', ');
      setText('rcWhere', where, 'Your address');
    }
    setText('rcSlot', slotText(), 'Choose a time');

    $('#rcItems').innerHTML = t.ls.map(({ p, q }) => `
      <li><div><b>${esc(p.name)}</b><small>${qtyText(p, q)} × ${kes(p.price)}${isBasket(p) ? '' : ' per kg'}</small></div><span>${kes(p.price * q)}</span></li>`).join('');

    $('#rcSub').textContent = kes(t.sub);
    $('#rcDiscRow').hidden = !t.discount;
    if (t.discount) { $('#rcDiscLabel').textContent = `Promo ${t.promo.key}`; $('#rcDisc').textContent = '− ' + kes(t.discount); }
    $('#rcDelLabel').textContent = t.pickup ? 'Pick up' : 'Delivery';
    $('#rcDel').textContent = t.delivery ? kes(t.delivery) : 'Free';
    const total = $('#rcTotal');
    if (total.textContent !== kes(t.total)) { total.textContent = kes(t.total); flash(total); }
    $('#rcMethod').textContent = METHODS[st.method].name;

    // everywhere else the total shows up
    $$('.totalRef').forEach((el) => { el.textContent = kes(t.total); });
    $('#barTotal').textContent = kes(t.total);
    $('#sumToggleTotal').textContent = kes(t.total);
    $('#payLabel').textContent = st.method === 'paypal' ? `Continue to PayPal · ${kes(t.total)}` : `Pay ${kes(t.total)} ${METHODS[st.method].pay}`;
    $('#payBarBtn').textContent = st.method === 'paypal' ? 'Continue' : 'Pay now';
    $('#ppUsd').textContent = 'USD ' + KK_PAY.usd(t.total).toFixed(2);
    $('#ppRate').textContent = `(1 USD = KES ${KK_PAY.kesPerUsd})`;
    updateSteps();
  }


  /* =========================================================
     Promo code
     ========================================================= */
  function drawPromo() {
    const t = totals();
    const msg = $('#promoMsg'), input = $('#promoIn'), btn = $('#promoBtn');
    if (promoCode && t.promo && t.promo.ok) {
      msg.className = 'promo-msg ok';
      msg.textContent = `${t.promo.key} applied: ${t.promo.label}.`;
      input.value = t.promo.key; input.readOnly = true; btn.textContent = 'Remove';
    } else {
      input.readOnly = false; btn.textContent = 'Apply';
      if (promoCode && t.promo && !t.promo.ok) { msg.className = 'promo-msg err'; msg.textContent = t.promo.error + '.'; input.value = promoCode; }
      else { msg.className = 'promo-msg'; msg.textContent = ''; }
    }
    $('#promoTags').innerHTML = 'Try: ' + Object.keys(KK_PROMOS).map((k) => `<button type="button" data-code="${k}">${k}</button>`).join('');
  }
  function applyPromo(code) {
    const t = totals();
    const r = KK_checkPromo(code, t.sub);
    if (!r.ok) {
      const msg = $('#promoMsg'); msg.className = 'promo-msg err'; msg.textContent = r.error + '.';
      if (r.key) { promoCode = r.key; save('kk_promo', promoCode); }
      renderReceipt(); return;
    }
    promoCode = r.key; save('kk_promo', promoCode);
    drawPromo(); renderReceipt();
  }
  $('#promoBtn').addEventListener('click', () => {
    if ($('#promoIn').readOnly) { promoCode = ''; save('kk_promo', ''); $('#promoIn').value = ''; drawPromo(); renderReceipt(); return; }
    applyPromo($('#promoIn').value);
  });
  $('#promoIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#promoBtn').click(); } });
  $('#promoTags').addEventListener('click', (e) => {
    const b = e.target.closest('[data-code]');
    if (b) { if ($('#promoIn').readOnly) { promoCode = ''; } $('#promoIn').readOnly = false; $('#promoIn').value = b.dataset.code; applyPromo(b.dataset.code); }
  });


  /* =========================================================
     Form behaviour
     ========================================================= */
  // delivery or pickup
  $$('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
    st.mode = r.value;
    $('#deliveryFields').hidden = st.mode === 'pickup';
    $('#pickupInfo').hidden = st.mode !== 'pickup';
    $('#slotLegend').textContent = st.mode === 'pickup' ? 'Pick up time' : 'Delivery time';
    renderReceipt();
  }));
  $('#slotGrid').addEventListener('change', (e) => { if (e.target.name === 'slot') { st.slot = e.target.value; renderReceipt(); } });

  // pick a payment method
  function setMethod(m) {
    st.method = m;
    ['mpesa', 'airtel', 'card', 'paypal'].forEach((k) => { $('#panel-' + k).hidden = k !== m; });
    renderReceipt();
  }
  $$('input[name="method"]').forEach((r) => r.addEventListener('change', () => setMethod(r.value)));

  // live receipt + gentle validation while typing
  ['cName', 'cPhone', 'cEmail', 'cCounty', 'cArea', 'cLandmark', 'cNotes'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true' && RULES[id]) check(id); renderReceipt(); });
    el.addEventListener('change', renderReceipt);
    el.addEventListener('blur', () => { if (RULES[id] && (el.value || id === 'cCounty')) check(id); });
  });

  // copy the phone number into the M-Pesa / Airtel boxes until the customer edits them
  ['mpPhone', 'arPhone'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { el.dataset.auto = ''; if (el.getAttribute('aria-invalid') === 'true') check(id); });
    el.addEventListener('blur', () => { if (el.value) check(id); });
  });
  $('#cPhone').addEventListener('input', () => {
    ['mpPhone', 'arPhone'].forEach((id) => { const el = document.getElementById(id); if (el.dataset.auto) el.value = $('#cPhone').value; });
  });

  // card: formatting, brand logo, checks
  const ccNum = $('#ccNumber');
  ccNum.addEventListener('input', () => {
    let d = ccNum.value.replace(/\D/g, '').slice(0, 19);
    const brand = brandOf(d);
    ccNum.value = brand === 'amex' ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : d.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('#ccBrand use').setAttribute('href', brand ? `#i-${brand}` : '#i-card');
    $('#ccCvv').maxLength = brand === 'amex' ? 4 : 3;
    $('#ccCvv').placeholder = brand === 'amex' ? '1234' : '123';
    if (ccNum.getAttribute('aria-invalid') === 'true') check('ccNumber');
  });
  $('#ccExp').addEventListener('input', (e) => {
    let d = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = d.slice(0, 2) + ' / ' + d.slice(2);
    else if (d.length === 2 && e.inputType !== 'deleteContentBackward') d += ' / ';
    e.target.value = d;
    if (e.target.getAttribute('aria-invalid') === 'true') check('ccExp');
  });
  $('#ccCvv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
  ['ccNumber', 'ccName', 'ccExp', 'ccCvv'].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => { if (el.value) check(id); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(id); });
  });

  $('[data-copy-ref]').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(orderId); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = orderId; }
    setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
  });
  $('#cTerms').addEventListener('change', () => { if ($('#cTerms').checked) showErr('cTerms', ''); });

  // phone: the order summary opens and closes
  $('#sumToggle').addEventListener('click', () => {
    const open = $('#receiptCol').classList.toggle('open');
    $('#sumToggle').setAttribute('aria-expanded', String(open));
  });


  /* =========================================================
     Paying
     ========================================================= */
  const ov = { ctrl: null, timer: null };

  function buildOrder() {
    const t = totals();
    return {
      id: orderId,
      items: t.ls.map(({ p, q }) => ({ id: p.id, qty: q })),
      promo: promoCode || '',
      amount: t.total, currency: 'KES',
      customer: { name: $('#cName').value.trim(), phone: $('#cPhone').value.trim(), email: $('#cEmail').value.trim() },
      delivery: {
        mode: st.mode, county: $('#cCounty').value, area: $('#cArea').value.trim(),
        landmark: $('#cLandmark').value.trim(), notes: $('#cNotes').value.trim(), slot: slotText()
      }
    };
  }

  function validateAll() {
    let ok = true, first = null;
    [...idsFor(), ...methodIds(), 'cTerms'].forEach((id) => {
      const good = check(id);
      if (!good) { ok = false; if (!first) first = document.getElementById(id); }
    });
    if (!st.slot) { $('#slot-err').textContent = 'Choose a time.'; ok = false; }
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
    return ok;
  }

  const PHONE_ART = '<svg viewBox="0 0 64 64" width="84" height="84"><rect x="18" y="4" width="28" height="56" rx="6" fill="#0B3D2A"/><rect x="22" y="12" width="20" height="34" rx="2" fill="#E6F6EE"/><circle cx="32" cy="53" r="2.6" fill="#9BE8C3"/><path d="M27 29l4 4 7-8" stroke="#009E60" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function openOverlay(method) {
    const o = $('#payOv'); o.hidden = false;
    document.body.classList.add('no-scroll');
    $('#ovErr').hidden = true; $('#ovRetry').hidden = true;
    $('#ovCancel').textContent = 'Cancel'; $('#ovCancel').hidden = false;
    const push = method === 'mpesa' || method === 'airtel';
    $('#ovArt').innerHTML = push ? `<div class="ring"></div>${PHONE_ART}` : '<div class="spin"></div>';
    $('#ovSteps').hidden = !push; $('#ovTimer').hidden = true;
    if (push) {
      const phone = method === 'mpesa' ? $('#mpPhone').value : $('#arPhone').value;
      $('#ovTitle').textContent = 'Check your phone';
      $('#ovText').textContent = `We are sending a payment request to ${phone.trim()} for ${kes(totals().total)}.`;
      $('#ovSteps').innerHTML = '<li class="on">Sending the request</li><li>Enter your PIN on your phone</li><li>We confirm your payment</li>';
    } else if (method === 'card') {
      $('#ovTitle').textContent = 'Securely processing your card';
      $('#ovText').textContent = 'Please do not close this page. Your bank may ask you to confirm the payment.';
    } else {
      $('#ovTitle').textContent = 'Taking you to PayPal';
      $('#ovText').textContent = 'Log in to PayPal to approve the payment. You will come straight back here.';
    }
    $('#ovCancel').focus();
  }
  function closeOverlay() {
    $('#payOv').hidden = true; document.body.classList.remove('no-scroll');
    clearInterval(ov.timer); ov.timer = null;
  }
  function onStatus(name) {
    const li = $$('#ovSteps li');
    if (name === 'sent') { li[0].className = 'done'; li[1].className = 'on'; $('#ovTitle').textContent = 'Enter your PIN'; $('#ovText').textContent = 'Approve the request on your phone. Do not close this page.'; }
    if (name === 'waiting') {
      const end = Date.now() + KK_PAY.poll.timeoutMs;
      const tick = () => {
        const s = Math.max(0, Math.round((end - Date.now()) / 1000));
        $('#ovTimer').hidden = false; $('#ovTimer').textContent = `Waiting for your approval... ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };
      tick(); clearInterval(ov.timer); ov.timer = setInterval(tick, 1000);
    }
  }
  function overlayError(msg) {
    clearInterval(ov.timer);
    $('#ovArt').innerHTML = '<div class="bad" aria-hidden="true">!</div>';
    $('#ovTitle').textContent = 'Payment not completed';
    $('#ovText').textContent = 'No worries, you can try again or choose another payment method.';
    $('#ovSteps').hidden = true; $('#ovTimer').hidden = true;
    $('#ovErr').textContent = msg; $('#ovErr').hidden = false;
    $('#ovRetry').hidden = false; $('#ovCancel').textContent = 'Close';
    $('#ovRetry').focus();
  }

  async function startPay() {
    if (!validateAll()) return;
    const order = buildOrder();
    const m = st.method;
    const data = m === 'card'
      ? { card: { number: $('#ccNumber').value.replace(/\s/g, ''), name: $('#ccName').value.trim(), exp: $('#ccExp').value.replace(/\s/g, ''), cvv: $('#ccCvv').value } }
      : { phone: m === 'mpesa' ? $('#mpPhone').value : $('#arPhone').value };

    if (m === 'paypal') save('kk_pending', order);       // so we can finish when PayPal sends them back
    openOverlay(m);
    ov.ctrl = new AbortController();
    try {
      const res = await KK_PAY.pay(m, order, data, { status: onStatus }, ov.ctrl.signal);
      closeOverlay();
      finish(res, order);
    } catch (err) {
      if (err && err.name === 'AbortError') { closeOverlay(); return; }
      overlayError(err.message || 'Something went wrong.');
    }
  }

  $('#coForm').addEventListener('submit', (e) => { e.preventDefault(); startPay(); });
  $('#ovCancel').addEventListener('click', () => { if (ov.ctrl) ov.ctrl.abort(); closeOverlay(); });
  $('#ovRetry').addEventListener('click', () => { closeOverlay(); startPay(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#payOv').hidden) $('#ovCancel').click(); });

  /* ---------- Success ---------- */
  function finish(res, order) {
    st.snapshot = lines();                                // keep the items on the receipt
    st.paid = { reference: res.reference || '', at: new Date() };

    const orders = load('kk_orders', []);
    orders.unshift({ id: order.id, total: totals().total, method: METHODS[st.method].name, reference: st.paid.reference, at: st.paid.at.toISOString(), items: order.items });
    save('kk_orders', orders.slice(0, 30));
    drop('kk_crate'); drop('kk_promo'); drop('kk_pending');
    try { sessionStorage.removeItem('kk_order_id'); } catch (e) { /* ignore */ }

    document.body.classList.add('is-paid');
    $('#rcStamp').textContent = 'Paid'; $('#rcStamp').classList.add('paid');
    $('#rcRefRow').hidden = !st.paid.reference; $('#rcRef').textContent = st.paid.reference;
    $('#rcPaidRow').hidden = false; $('#rcPaidAt').textContent = st.paid.at.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    $('#rcMethod').textContent = METHODS[st.method].name;
    $('#coForm').hidden = true; $('.co-back').hidden = true; $('#sumToggle').hidden = true;
    $('#coDone').hidden = false;
    const first = order.customer.name.split(' ')[0];
    $('#doneName').textContent = first ? ', ' + first : '';
    $('#doneText').textContent = `Order ${order.id} is confirmed. We will ${st.mode === 'pickup' ? 'have it ready for pick up' : 'deliver it'} ${slotText().toLowerCase()}.${order.customer.email ? ' A copy of your receipt is on its way to ' + order.customer.email + '.' : ''}`;
    $('#waLink').href = `https://wa.me/254794008285?text=${encodeURIComponent('Hi Kijani Kilo, I just paid for order ' + order.id + '.')}`;
    $('.co-title').textContent = 'Order complete';
    $('#receiptCol').classList.add('open');
    updateSteps();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#printBtn').addEventListener('click', () => window.print());


  /* =========================================================
     Coming back from PayPal
     ========================================================= */
  async function paypalReturn() {
    const q = new URLSearchParams(location.search);
    const kind = q.get('paypal');
    if (!kind) return false;
    history.replaceState(null, '', location.pathname);
    const pending = load('kk_pending', null);
    if (kind === 'cancel' || !pending) { return false; }
    st.method = 'paypal';
    openOverlay('paypal');
    $('#ovTitle').textContent = 'Confirming your PayPal payment';
    $('#ovText').textContent = 'One moment while we check with PayPal.';
    try {
      const res = await KK_PAY.capturePaypal(q.get('token'), pending.id);
      closeOverlay();
      finish(res, pending);
    } catch (err) { overlayError(err.message || 'We could not confirm the PayPal payment.'); }
    return true;
  }


  /* =========================================================
     Start
     ========================================================= */
  $('#year').textContent = new Date().getFullYear();
  $('#altPaybill').textContent = KK_PAY.paybill;
  $('#demoNote').hidden = KK_PAY.live;

  if (!Object.keys(crate).length && !new URLSearchParams(location.search).get('paypal')) {
    $('#coGrid').hidden = true; $('#coEmpty').hidden = false; $('#sumToggle').hidden = true;
    $('#payBar').hidden = true; $('.co-back').hidden = true;
  } else {
    buildSlots();
    drawPromo();
    renderReceipt();
    paypalReturn();
  }
  setInterval(() => { if (!st.paid) $('#rcDate').textContent = new Date().toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }, 30000);
})();
