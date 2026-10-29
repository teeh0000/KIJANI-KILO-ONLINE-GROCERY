/* =========================================================
   KIJANI KILO | OFFERS PAGE
   Needs script.js (header) and products.js (deals + promo codes).
   Deals are not typed here: they come from KK_DEALS in products.js.
   ========================================================= */
(() => {
  'use strict';

  const IMG_EXT = ['jpg', 'png', 'jpeg', 'webp', 'jfif', 'avif', 'gif', 'JPG', 'PNG', 'JPEG'];
  const CATS = KK_CATEGORIES;
  const catById = new Map(CATS.map((c) => [c.id, c]));

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const kes = (n) => 'KES ' + Math.round(n).toLocaleString('en-KE');
  const num = (n) => String(+Number(n).toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chipLabel = (w) => (w === 0.25 ? '¼' : w === 0.5 ? '½' : String(w));
  const isBasket = (p) => catById.get(p.cat).unit === 'basket';
  const qtyText = (p, q) => (isBasket(p) ? `${num(q)} ${q === 1 ? 'basket' : 'baskets'}` : `${num(q)} kg`);
  const defaultW = (p) => (isBasket(p) ? 1 : (catById.get(p.cat).chips.includes(1) ? 1 : catById.get(p.cat).chips[0]));
  const pct = (p) => Math.round((1 - p.price / p.was) * 100);

  /* ---------- Photos (same rules as the shop page) ---------- */
  const LEAF = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38C8 20 20 9 40 8c-1 20-12 31-29 31" fill="currentColor"/><path d="M10 39c6-9 13-16 22-21" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const placeholder = () => `<span class="ph" aria-hidden="true">${LEAF}</span>`;
  const imgSrc = (base, i) => `images/${encodeURIComponent(base)}.${IMG_EXT[i]}`;
  const photo = (p, cls) => {
    if (!catById.get(p.cat).photos || !p.img) return placeholder();
    return `<img class="${cls}" src="${imgSrc(p.img, 0)}" data-img="${esc(p.img)}" data-try="0" alt="${esc(p.name)}" loading="lazy" decoding="async">`;
  };
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.img) return;
    const next = Number(img.dataset.try) + 1;
    if (next < IMG_EXT.length) { img.dataset.try = String(next); img.src = imgSrc(img.dataset.img, next); }
    else { console.warn(`Kijani Kilo: no photo found for "${img.alt}" (looked for images/${img.dataset.img}.jpg and other endings)`); img.outerHTML = placeholder(); }
  }, true);

  /* ---------- Toast ---------- */
  let toastTimer;
  const toast = (msg, withLink) => {
    const t = $('#toast');
    t.innerHTML = esc(msg) + (withLink ? ' <a href="shop.html#cart">View crate</a>' : '');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), withLink ? 3800 : 2200);
  };

  /* ---------- Add to the shared crate (lives in the browser, opened on shop.html) ---------- */
  function addToCrate(p, amount) {
    const crate = load('kk_crate', {});
    const have = crate[p.id] || 0;
    if (have >= p.stock) { toast(`That is all the ${p.name.toLowerCase()} we have today`); return; }
    crate[p.id] = Math.min(p.stock, have + amount);
    save('kk_crate', crate);
    if (window.KijaniKilo) window.KijaniKilo.setCartCount(Object.keys(crate).length);
    toast(`${qtyText(p, crate[p.id] - have)} of ${p.name} added`, true);
  }

  /* ---------- Data ---------- */
  const flash = KK_PRODUCTS.find((p) => p.name === KK_FLASH && p.was > p.price);
  const deals = KK_PRODUCTS.filter((p) => p.was > p.price && p !== flash);
  const allDeals = flash ? [flash, ...deals] : deals;

  // the hanging tags in the hero use real numbers
  const maxSave = Math.max(0, ...allDeals.map(pct));
  if (flash) {
    $('[data-flash-name]').textContent = flash.name;
    $('[data-flash-price]').textContent = kes(flash.price);
  }
  $('[data-max]').textContent = maxSave + '%';

  document.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (j) { const el = document.getElementById(j.dataset.jump); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });


  /* =========================================================
     1. Flash deal of the day
     ========================================================= */
  const flashBox = $('#flashBox');
  let flashW = flash ? defaultW(flash) : 1;

  function renderFlash() {
    if (!flash) { $('#flash').hidden = true; return; }
    const cat = catById.get(flash.cat);
    const out = flash.stock <= 0;
    flashBox.innerHTML = `
      <article class="flash" style="--tint:${cat.tint}">
        <div class="flash-media">${photo(flash, 'flash-img')}<span class="flash-stamp">Flash deal</span></div>
        <div class="flash-body">
          <p class="flash-kicker">Today only</p>
          <h3>${esc(flash.name)}</h3>
          <p class="flash-price"><b>${kes(flash.price)}</b><span>${isBasket(flash) ? 'per basket' : 'per kg'}</span><s>${kes(flash.was)}</s><em>Save ${pct(flash)}%</em></p>
          <div class="count" role="timer" aria-label="Time left on the flash deal">
            <div><b id="cdH">00</b><small>hours</small></div><span aria-hidden="true">:</span>
            <div><b id="cdM">00</b><small>minutes</small></div><span aria-hidden="true">:</span>
            <div><b id="cdS">00</b><small>seconds</small></div>
          </div>
          <p class="flash-note">Ends tonight at midnight${flash.stock > 0 ? ` · ${flash.stock} ${isBasket(flash) ? 'baskets' : 'kg'} in stock` : ''}</p>
          <div class="buy">
            ${isBasket(flash) ? '' : `<div class="chipset" role="radiogroup" aria-label="Choose weight in kilograms">${cat.chips.map((c) => `<button type="button" class="chip-w" role="radio" aria-checked="${c === flashW}" data-w="${c}">${chipLabel(c)} kg</button>`).join('')}</div>`}
            <button type="button" class="add-btn" id="flashAdd" ${out ? 'disabled' : ''}>${out ? 'Out of stock' : `Add ${isBasket(flash) ? '1 basket' : chipLabel(flashW) + ' kg'} to crate`}</button>
          </div>
        </div>
      </article>`;
    tick();
  }

  flashBox.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-w');
    if (chip) {
      flashW = Number(chip.dataset.w);
      $$('.chip-w', flashBox).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
      $('#flashAdd').textContent = `Add ${chipLabel(flashW)} kg to crate`;
      return;
    }
    if (e.target.closest('#flashAdd')) addToCrate(flash, isBasket(flash) ? 1 : flashW);
  });

  function tick() {
    const h = $('#cdH'); if (!h) return;
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);          // next local midnight
    const s = Math.max(0, Math.floor((end - now) / 1000));
    const pad = (n) => String(n).padStart(2, '0');
    h.textContent = pad(Math.floor(s / 3600));
    $('#cdM').textContent = pad(Math.floor((s % 3600) / 60));
    $('#cdS').textContent = pad(s % 60);
  }
  setInterval(tick, 1000);


  /* =========================================================
     2. Price drops (punched price tags)
     ========================================================= */
  const state = { cat: 'all', sort: 'saving' };
  const qty = {};

  const dealCard = (p) => {
    const cat = catById.get(p.cat), basket = isBasket(p), out = p.stock <= 0;
    if (qty[p.id] === undefined) qty[p.id] = defaultW(p);
    return `
    <article class="dt${out ? ' out' : ''}" data-id="${p.id}" style="--tint:${cat.tint}">
      <div class="dt-wrap"><div class="dt-inner">
        <div class="dt-media">${photo(p, 'dt-img')}<span class="dt-save">-${pct(p)}%</span></div>
        <h3>${esc(p.name)}</h3>
        <p class="dt-price"><b>${kes(p.price)}</b><s>${kes(p.was)}</s><span>${basket ? 'per basket' : 'per kg'}</span></p>
        <p class="dt-note">Save ${kes(p.was - p.price)} ${basket ? 'per basket' : 'on every kg'}</p>
        <p class="dt-stock">${out ? 'Out of stock' : (!basket && p.stock <= 10 ? `Only ${p.stock} kg left` : '')}</p>
        <div class="dt-foot">
          ${basket ? '<span></span>' : `<div class="dt-step" role="group" aria-label="Weight for ${esc(p.name)}">
            <button type="button" data-act="dec" aria-label="Less ${esc(p.name)}" ${out ? 'disabled' : ''}>−</button>
            <output>${num(qty[p.id])} kg</output>
            <button type="button" data-act="inc" aria-label="More ${esc(p.name)}" ${out ? 'disabled' : ''}>+</button></div>`}
          <button type="button" class="dt-add" data-act="add" aria-label="Add ${esc(p.name)} to crate" ${out ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>
          </button>
        </div>
      </div></div>
    </article>`;
  };

  function renderDrops() {
    const cats = CATS.filter((c) => deals.some((d) => d.cat === c.id));
    $('#dropFilters').innerHTML =
      `<button type="button" class="f-chip" aria-pressed="${state.cat === 'all'}" data-cat="all">All deals<small>${deals.length}</small></button>` +
      cats.map((c) => `<button type="button" class="f-chip" aria-pressed="${state.cat === c.id}" data-cat="${c.id}">${esc(c.name)}<small>${deals.filter((d) => d.cat === c.id).length}</small></button>`).join('');

    let list = deals.filter((d) => state.cat === 'all' || d.cat === state.cat);
    if (state.sort === 'saving') list = [...list].sort((a, b) => pct(b) - pct(a));
    if (state.sort === 'price') list = [...list].sort((a, b) => a.price - b.price);
    if (state.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    $('#dgrid').innerHTML = list.length ? list.map(dealCard).join('') : '<p class="empty-d">No deals in this section right now.</p>';
  }

  $('#dropFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) { state.cat = b.dataset.cat; renderDrops(); }
  });
  $('#dropSort').addEventListener('change', (e) => { state.sort = e.target.value; renderDrops(); });

  $('#dgrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.dt');
    const p = KK_PRODUCTS.find((x) => x.id === card.dataset.id);
    const step = catById.get(p.cat).step;
    if (btn.dataset.act === 'inc') qty[p.id] = Math.min(Math.min(p.stock, 25), qty[p.id] + step);
    if (btn.dataset.act === 'dec') qty[p.id] = Math.max(step, qty[p.id] - step);
    if (btn.dataset.act === 'inc' || btn.dataset.act === 'dec') { $('output', card).textContent = `${num(qty[p.id])} kg`; return; }
    if (btn.dataset.act === 'add') addToCrate(p, isBasket(p) ? 1 : qty[p.id]);
  });


  /* =========================================================
     3. Promo tickets: copy a code, or send it to the crate
     ========================================================= */
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) { /* ignore */ }
      ta.remove(); return ok;
    }
  }

  $('#codes').addEventListener('click', async (e) => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const ok = await copyText(copy.dataset.copy);
      const old = copy.textContent;
      copy.textContent = ok ? 'Copied' : 'Copy failed';
      toast(ok ? `${copy.dataset.copy} copied` : 'Select the code and copy it by hand');
      setTimeout(() => { copy.textContent = old; }, 1600);
      return;
    }
    const use = e.target.closest('[data-use]');
    if (use) save('kk_promo', use.dataset.use);       // the crate on shop.html applies it automatically
  });


  /* ---------- Start ---------- */
  renderFlash();
  renderDrops();
})();
