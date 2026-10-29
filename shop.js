/* =========================================================
   KIJANI KILO | SHOP PAGE
   Needs products.js (data) and script.js (header) loaded first.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Settings you may want to change ---------- */
  const FREE_FROM = 2000;                    // free delivery above this subtotal (KES)
  const DELIVERY_FEE = 150;                  // delivery fee below that (KES)
  const IMG_EXT = ['jpg', 'png', 'jpeg', 'webp'];   // file types tried for each product photo

  const CATS = KK_CATEGORIES;
  const PRODUCTS = KK_PRODUCTS;
  const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
  const catById = new Map(CATS.map((c) => [c.id, c]));

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Saved state (crate + hearts) ---------- */
  const load = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch (e) { return fallback; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };

  let crate = load('kk_crate', {});
  Object.keys(crate).forEach((id) => { if (!byId.has(id)) delete crate[id]; });
  const wish = new Set(load('kk_wish', []));
  const picked = {};                          // weight chosen on each card
  const state = { q: '', sort: 'default', stock: false };

  /* ---------- Small helpers ---------- */
  const kes = (n) => 'KES ' + Math.round(n).toLocaleString('en-KE');
  const num = (n) => String(+Number(n).toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const chipLabel = (w) => (w === 0.25 ? '¼' : w === 0.5 ? '½' : String(w));
  const isBasket = (p) => catById.get(p.cat).unit === 'basket';
  const qtyText = (p, q) => (isBasket(p) ? `${num(q)} ${q === 1 ? 'basket' : 'baskets'}` : `${num(q)} kg`);
  const defaultWeight = (p) => (isBasket(p) ? 1 : (catById.get(p.cat).chips.includes(1) ? 1 : catById.get(p.cat).chips[0]));
  const tagText = { fresh: 'Fresh today', best: 'Best seller', offer: 'On offer', organic: 'Organic', new: 'New' };

  let toastTimer;
  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ---------- Pictures (with a tidy fallback) ---------- */
  const LEAF = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38C8 20 20 9 40 8c-1 20-12 31-29 31" fill="currentColor"/><path d="M10 39c6-9 13-16 22-21" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const placeholder = () => `<span class="ph" aria-hidden="true">${LEAF}</span>`;
  const imgSrc = (base, i) => `images/${encodeURIComponent(base)}.${IMG_EXT[i]}`;

  const photo = (p, cls) => {
    const cat = catById.get(p.cat);
    if (!cat.photos || !p.img) return placeholder();
    return `<img class="${cls}" src="${imgSrc(p.img, 0)}" data-img="${esc(p.img)}" data-try="0" alt="${esc(p.name)}" loading="lazy" decoding="async">`;
  };

  // If a photo fails to load, try the next file type, then fall back to the leaf
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.img) return;
    const next = Number(img.dataset.try) + 1;
    if (next < IMG_EXT.length) {
      img.dataset.try = String(next);
      img.src = imgSrc(img.dataset.img, next);
    } else {
      img.outerHTML = placeholder();
    }
  }, true);


  /* =========================================================
     1. Category rail (sticky pills)
     ========================================================= */
  const rail = $('#railScroll');
  rail.innerHTML = CATS.map((c) => `
    <button type="button" class="rail-pill" data-go="${c.id}" style="--tint:${c.tint}">
      <span class="rail-dot">${LEAF}</span>
      <span class="rail-name">${esc(c.name)}</span>
      <small data-count="${c.id}">${KK_ROWS[c.id].length}</small>
    </button>`).join('');

  rail.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (b) goTo(b.dataset.go);
  });

  function goTo(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + id);
    }
  }
  $$('[data-jump]').forEach((b) => b.addEventListener('click', () => goTo(b.dataset.jump)));

  let spy;
  function watchSections() {
    if (spy) spy.disconnect();
    if (!('IntersectionObserver' in window)) return;
    spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        $$('.rail-pill', rail).forEach((pill) => {
          const on = pill.dataset.go === en.target.id;
          pill.classList.toggle('on', on);
          if (on) {
            pill.setAttribute('aria-current', 'true');
            if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: pill.offsetLeft - 24, behavior: 'smooth' });
          } else pill.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-30% 0px -62% 0px' });
    $$('.sh-sec').forEach((s) => spy.observe(s));
  }


  /* =========================================================
     2. Product cards
     ========================================================= */
  const cardHTML = (p, cat) => {
    const out = p.stock <= 0;
    const basket = cat.unit === 'basket';
    const w = picked[p.id] ?? defaultWeight(p);
    picked[p.id] = w;
    const low = !out && !basket && p.stock <= 10;
    const tag = out ? '' : (p.tag ? `<span class="pc-tag pc-tag--${p.tag}">${tagText[p.tag]}</span>` : '');

    const weights = basket
      ? `<p class="pc-note">${esc(p.note)}</p>`
      : `<div class="pc-weights" role="radiogroup" aria-label="Choose weight in kilograms">
           ${cat.chips.map((c) => `<button type="button" class="pc-w" role="radio" aria-checked="${c === w}" data-w="${c}" ${out ? 'disabled' : ''}>${chipLabel(c)}<i>kg</i></button>`).join('')}
         </div>`;

    return `
    <article class="pc${out ? ' out' : ''}" data-id="${p.id}" style="--tint:${cat.tint}">
      <div class="pc-media">
        ${photo(p, 'pc-img')}
        ${tag}
        <button type="button" class="pc-heart" aria-pressed="${wish.has(p.id)}" aria-label="Save ${esc(p.name)}" data-act="heart">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>
        </button>
      </div>
      <div class="pc-body">
        <h3 class="pc-name">${esc(p.name)}</h3>
        <p class="pc-price"><b>${kes(p.price)}</b> <span>${basket ? 'per basket' : 'per kg'}</span>${p.was ? ` <s>${kes(p.was)}</s>` : ''}</p>
        ${weights}
        <p class="pc-stock">${out ? 'Out of stock' : low ? `Only ${p.stock} kg left` : ''}</p>
        <div class="pc-foot">
          <span class="pc-quote" data-quote>${kes(p.price * (basket ? 1 : w))}</span>
          <button type="button" class="pc-add" data-act="add" ${out ? 'disabled' : ''} aria-label="Add ${basket ? '1 basket' : num(w) + ' kg'} of ${esc(p.name)} to crate">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>
          </button>
        </div>
        <p class="pc-in" data-in hidden></p>
      </div>
    </article>`;
  };

  function render() {
    const q = state.q.trim().toLowerCase();
    let total = 0;

    $('#sections').innerHTML = CATS.map((cat) => {
      let list = PRODUCTS.filter((p) => p.cat === cat.id
        && (!q || p.name.toLowerCase().includes(q) || p.note.toLowerCase().includes(q))
        && (!state.stock || p.stock > 0));
      if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
      if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
      if (state.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));

      total += list.length;
      const countEl = $(`[data-count="${cat.id}"]`);
      if (countEl) countEl.textContent = list.length;

      return `
      <section class="sh-sec" id="${cat.id}" aria-labelledby="h-${cat.id}" ${list.length ? '' : 'hidden'} style="--tint:${cat.tint}">
        <div class="sec-head">
          <div>
            <h2 id="h-${cat.id}">${esc(cat.name)}</h2>
            <p>${esc(cat.blurb)}</p>
          </div>
          <span class="sec-count">${list.length} ${list.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div class="grid">${list.map((p) => cardHTML(p, cat)).join('')}</div>
      </section>`;
    }).join('');

    $('#none').hidden = total > 0;
    $('#resultNote').textContent = q || state.stock ? `${total} ${total === 1 ? 'item' : 'items'} found` : `${PRODUCTS.length} items in ${CATS.length} sections`;
    $$('.rail-pill', rail).forEach((pill) => { pill.disabled = Number($('[data-count]', pill).textContent) === 0; });

    syncCards();
    watchSections();
  }

  function syncCards() {
    $$('.pc').forEach((card) => {
      const p = byId.get(card.dataset.id);
      const q = crate[p.id];
      card.classList.toggle('in', Boolean(q));
      const line = $('[data-in]', card);
      line.hidden = !q;
      if (q) line.textContent = `${qtyText(p, q)} in your crate`;
    });
  }

  /* Card interactions (one listener for all cards) */
  $('#sections').addEventListener('click', (e) => {
    const card = e.target.closest('.pc');
    if (!card) return;
    const p = byId.get(card.dataset.id);

    const chip = e.target.closest('.pc-w');
    if (chip) {
      const w = Number(chip.dataset.w);
      picked[p.id] = w;
      $$('.pc-w', card).forEach((c) => c.setAttribute('aria-checked', String(c === chip)));
      $('[data-quote]', card).textContent = kes(p.price * w);
      $('.pc-add', card).setAttribute('aria-label', `Add ${num(w)} kg of ${p.name} to crate`);
      return;
    }

    const act = e.target.closest('[data-act]');
    if (!act) return;

    if (act.dataset.act === 'heart') {
      const on = !wish.has(p.id);
      on ? wish.add(p.id) : wish.delete(p.id);
      act.setAttribute('aria-pressed', String(on));
      save('kk_wish', [...wish]);
      toast(on ? `${p.name} saved` : `${p.name} removed from saved`);
    }

    if (act.dataset.act === 'add') {
      addToCrate(p, isBasket(p) ? 1 : picked[p.id], act);
    }
  });

  function addToCrate(p, amount, btn) {
    const have = crate[p.id] || 0;
    if (have >= p.stock) { toast(`That is all the ${p.name.toLowerCase()} we have today`); return; }
    const next = Math.min(p.stock, have + amount);
    crate[p.id] = next;
    commit();
    toast(`${qtyText(p, next - have)} of ${p.name} added`);
    if (btn) {
      btn.classList.add('done');
      setTimeout(() => btn.classList.remove('done'), 900);
    }
  }


  /* =========================================================
     3. Toolbar (search, sort, in stock)
     ========================================================= */
  let searchTimer;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value; render(); }, 160);
  });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('#stock').addEventListener('change', (e) => { state.stock = e.target.checked; render(); });
  $('#clearSearch').addEventListener('click', () => {
    $('#q').value = ''; state.q = ''; state.stock = false; $('#stock').checked = false; render(); $('#q').focus();
  });


  /* =========================================================
     4. The crate (cart summary)
     ========================================================= */
  const drawer = $('#crate');
  const overlay = $('#crateOv');
  const bar = $('#crateBar');
  let lastFocus = null;

  const lines = () => Object.keys(crate).map((id) => ({ p: byId.get(id), q: crate[id] }));
  const totals = () => {
    const ls = lines();
    const sub = ls.reduce((s, l) => s + l.p.price * l.q, 0);
    const kg = ls.reduce((s, l) => s + (isBasket(l.p) ? 0 : l.q), 0);
    const baskets = ls.reduce((s, l) => s + (isBasket(l.p) ? l.q : 0), 0);
    const delivery = sub === 0 ? 0 : (sub >= FREE_FROM ? 0 : DELIVERY_FEE);
    return { ls, sub, kg, baskets, delivery, total: sub + delivery };
  };
  const weightSummary = (t) => [t.kg ? `${num(t.kg)} kg` : '', t.baskets ? `${num(t.baskets)} ${t.baskets === 1 ? 'basket' : 'baskets'}` : ''].filter(Boolean).join(' + ');

  const TRUCK = '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 4h20v14H2z" fill="currentColor"/><path d="M22 8h8l6 6v4H22z" fill="currentColor"/><circle cx="10" cy="19" r="3.4" fill="#fff" stroke="currentColor" stroke-width="2"/><circle cx="29" cy="19" r="3.4" fill="#fff" stroke="currentColor" stroke-width="2"/></svg>';

  function drawCrate() {
    const t = totals();
    const count = t.ls.length;
    $('#crateCount').textContent = count ? `${count} ${count === 1 ? 'item' : 'items'} · ${weightSummary(t)}` : 'Nothing here yet';

    if (!count) {
      $('#crateBody').innerHTML = `
        <div class="cr-empty">
          <div class="cr-empty-art">${LEAF}</div>
          <h3>Your crate is empty</h3>
          <p>Pick a weight on any card and tap the green plus.</p>
          <button type="button" class="btn-cta btn-cta--solid" data-close>Browse vegetables</button>
        </div>`;
      $('#crateFoot').hidden = true;
      return;
    }

    const left = Math.max(0, FREE_FROM - t.sub);
    const pct = Math.min(100, (t.sub / FREE_FROM) * 100);

    $('#crateBody').innerHTML = `
      <div class="truck" aria-label="Free delivery progress">
        <div class="truck-track"><i style="width:${pct}%"></i><span class="truck-icon" style="left:${pct}%">${TRUCK}</span></div>
        <p>${left > 0 ? `Add <b>${kes(left)}</b> more for free delivery` : '<b>Free delivery unlocked.</b> Nice crate.'}</p>
      </div>
      <ul class="cr-list">
        ${t.ls.map(({ p, q }) => {
          const cat = catById.get(p.cat);
          return `
          <li class="cr-line" data-id="${p.id}" style="--tint:${cat.tint}">
            <div class="cr-thumb">${photo(p, 'cr-img')}</div>
            <div class="cr-info">
              <b>${esc(p.name)}</b>
              <span>${kes(p.price)} ${isBasket(p) ? 'per basket' : 'per kg'}</span>
              <div class="cr-step" role="group" aria-label="Quantity for ${esc(p.name)}">
                <button type="button" data-cr="dec" aria-label="Less ${esc(p.name)}">−</button>
                <output>${qtyText(p, q)}</output>
                <button type="button" data-cr="inc" aria-label="More ${esc(p.name)}">+</button>
              </div>
            </div>
            <div class="cr-side">
              <b>${kes(p.price * q)}</b>
              <button type="button" class="cr-remove" data-cr="rm" aria-label="Remove ${esc(p.name)}">Remove</button>
            </div>
          </li>`;
        }).join('')}
      </ul>`;

    $('#crateFoot').hidden = false;
    $('#sumSub').textContent = kes(t.sub);
    $('#sumDel').textContent = t.delivery ? kes(t.delivery) : 'Free';
    $('#sumTotal').textContent = kes(t.total);
  }

  function drawBar() {
    const t = totals();
    const count = t.ls.length;
    bar.classList.toggle('show', count > 0);
    bar.setAttribute('aria-hidden', String(count === 0));
    bar.tabIndex = count ? 0 : -1;
    if (!count) return;
    $('#barThumbs').innerHTML = t.ls.slice(-3).map(({ p }) => `<span style="--tint:${catById.get(p.cat).tint}">${photo(p, 'bar-img')}</span>`).join('');
    $('#barText').innerHTML = `<b>${count} ${count === 1 ? 'item' : 'items'}</b><small>${weightSummary(t)}</small>`;
    $('#barTotal').textContent = kes(t.total);
  }

  function commit() {
    save('kk_crate', crate);
    syncCards();
    drawBar();
    drawCrate();
    if (window.KijaniKilo) window.KijaniKilo.setCartCount(Object.keys(crate).length);
  }

  function openCrate() {
    lastFocus = document.activeElement;
    drawCrate();
    drawer.classList.add('open');
    overlay.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    $('#crateClose').focus();
  }
  function closeCrate() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  bar.addEventListener('click', openCrate);
  overlay.addEventListener('click', closeCrate);
  $('#crateClose').addEventListener('click', closeCrate);

  // the cart icon in the header opens the crate too
  const headerCart = $('.nav-actions a[aria-label="Cart"]');
  if (headerCart) headerCart.addEventListener('click', (e) => { e.preventDefault(); openCrate(); });

  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeCrate(); return; }
    const btn = e.target.closest('[data-cr]');
    if (!btn) return;
    const id = btn.closest('.cr-line').dataset.id;
    const p = byId.get(id);
    const step = isBasket(p) ? 1 : catById.get(p.cat).step;
    if (btn.dataset.cr === 'inc') {
      if (crate[id] >= p.stock) { toast('That is all we have today'); return; }
      crate[id] = Math.min(p.stock, crate[id] + step);
    }
    if (btn.dataset.cr === 'dec') {
      crate[id] = crate[id] - step;
      if (crate[id] <= 0) delete crate[id];
    }
    if (btn.dataset.cr === 'rm') delete crate[id];
    commit();
  });

  $('#clearCrate').addEventListener('click', () => { crate = {}; commit(); });
  $('#checkoutBtn').addEventListener('click', () => {
    // Replace this with:  window.location.href = 'checkout.html';
    toast('Checkout is the next page to build');
  });

  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { closeCrate(); return; }
    if (e.key === 'Tab') {                       // keep focus inside the drawer
      const f = $$('button:not([disabled]), a[href]', drawer).filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });


  /* =========================================================
     5. Start up
     ========================================================= */
  render();
  commit();
  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) setTimeout(() => document.getElementById(id).scrollIntoView(), 80);
  }
})();
