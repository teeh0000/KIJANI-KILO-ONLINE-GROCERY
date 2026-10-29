/* =========================================================
   KIJANI KILO | HOME PAGE
   Needs script.js (header) and products.js (prices) loaded first.
   Everything on this page reads live prices from products.js,
   so changing a price there changes it here too.
   ========================================================= */
(() => {
  'use strict';

  const IMG_EXT = ['jpg', 'png', 'jpeg', 'webp', 'jfif', 'avif', 'gif', 'JPG', 'PNG', 'JPEG'];
  const CATS = KK_CATEGORIES;
  const catById = new Map(CATS.map((c) => [c.id, c]));
  const prod = (name) => KK_PRODUCTS.find((p) => p.name === name);
  const isBasket = (p) => catById.get(p.cat).unit === 'basket';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };
  const kes = (n) => 'KES ' + Math.round(n).toLocaleString('en-KE');
  const num = (n) => String(+Number(n).toFixed(2));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qtyText = (p, q) => (isBasket(p) ? `${num(q)} ${q === 1 ? 'basket' : 'baskets'}` : `${num(q)} kg`);
  const setFill = (input) => {
    const min = Number(input.min), max = Number(input.max);
    input.style.setProperty('--fill', ((input.value - min) / (max - min)) * 100 + '%');
  };

  /* ---------- Toast + the shared crate (opened on shop.html) ---------- */
  let toastTimer;
  const toast = (msg, withLink) => {
    const t = $('#toast');
    t.innerHTML = esc(msg) + (withLink ? ' <a href="shop.html#cart">View crate</a>' : '');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), withLink ? 3800 : 2200);
  };
  function addToCrate(p, amount, quiet) {
    const crate = load('kk_crate', {});
    const have = crate[p.id] || 0;
    if (have >= p.stock) { if (!quiet) toast(`That is all the ${p.name.toLowerCase()} we have today`); return false; }
    crate[p.id] = Math.min(p.stock, have + amount);
    save('kk_crate', crate);
    if (window.KijaniKilo) window.KijaniKilo.setCartCount(Object.keys(crate).length);
    if (!quiet) toast(`${qtyText(p, crate[p.id] - have)} of ${p.name} added`, true);
    return true;
  }

  /* ---------- Photos (only used on the category tiles) ---------- */
  const LEAF = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38C8 20 20 9 40 8c-1 20-12 31-29 31" fill="currentColor"/><path d="M10 39c6-9 13-16 22-21" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  const placeholder = () => `<span class="ph" aria-hidden="true">${LEAF}</span>`;
  const imgSrc = (base, i) => `images/${encodeURIComponent(base)}.${IMG_EXT[i]}`;
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.img) return;
    const next = Number(img.dataset.try) + 1;
    if (next < IMG_EXT.length) { img.dataset.try = String(next); img.src = imgSrc(img.dataset.img, next); }
    else img.outerHTML = placeholder();
  }, true);


  /* =========================================================
     1. THE KITCHEN SCALE (hero)
        Slide the weight: the needle swings, vegetables drop
        into the bowl and the price updates.
     ========================================================= */
  const SCALE_ITEMS = [
    ['Tomatoes', 'tomato', '#E5453B'], ['Sukuma wiki', 'leaf', '#2E9A52'], ['Carrots', 'carrot', '#F08A24'],
    ['Red onions', 'onion', '#8E3B9C'], ['Irish potatoes', 'potato', '#C99A5B']
  ].map(([n, kind, color]) => ({ p: prod(n), kind, color })).filter((x) => x.p);

  const TOKEN = {
    tomato: '<circle r="16" fill="#E5453B"/><path d="M-6 -14 L0 -8 L6 -14" stroke="#2E9A52" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="-6" cy="-4" r="3.2" fill="#fff" opacity=".35"/>',
    leaf: '<path d="M-16 9C-16 -10 -4 -18 15 -18 15 1 6 15 -13 15Z" fill="#2E9A52"/><path d="M-12 12C-4 4 4 -4 11 -13" stroke="#BFE9CF" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    carrot: '<path d="M-7 -14 L7 -14 L0 18Z" fill="#F08A24"/><path d="M-4 -14 L-7 -22 M0 -14 L0 -23 M4 -14 L7 -22" stroke="#2E9A52" stroke-width="3" stroke-linecap="round"/><path d="M-3 -4 H3 M-2 4 H2" stroke="#C86A12" stroke-width="2" stroke-linecap="round"/>',
    onion: '<circle r="15" fill="#8E3B9C"/><path d="M0 -15 L0 -23" stroke="#C9A3D1" stroke-width="3.2" stroke-linecap="round"/><path d="M-9 -3C-4 7 4 7 9 -3" stroke="#C57BD1" stroke-width="2" fill="none"/>',
    potato: '<ellipse rx="19" ry="13" fill="#C99A5B"/><circle cx="-7" cy="-3" r="2.2" fill="#A97B3F"/><circle cx="6" cy="3" r="2.2" fill="#A97B3F"/><circle cx="9" cy="-5" r="1.8" fill="#A97B3F"/>'
  };
  // 20 spots in the bowl, bottom row first (each token = half a kilo)
  const SLOTS = [];
  [[8, 81, 140], [6, 115, 110], [4, 149, 80], [2, 183, 50]].forEach(([n, x0, y]) => { for (let i = 0; i < n; i++) SLOTS.push([x0 + i * 34, y]); });

  const ks = { item: SCALE_ITEMS[0], kg: 5, drawn: 0 };

  function buildScale() {
    if (!SCALE_ITEMS.length) { $('#kscale').hidden = true; return; }
    $('#ksChips').innerHTML = SCALE_ITEMS.map((it, i) => `
      <label class="ks-chip" style="--c:${it.color}"><input type="radio" name="ksveg" value="${i}" ${i === 0 ? 'checked' : ''}><span>${esc(it.p.name)}</span></label>`).join('');

    // ticks on the dial
    let ticks = '';
    for (let i = 0; i <= 10; i++) {
      const a = (-90 + i * 18) * Math.PI / 180, r1 = i % 5 === 0 ? 80 : 86, r2 = 96;
      ticks += `<line x1="${(200 + r1 * Math.sin(a)).toFixed(1)}" y1="${(318 - r1 * Math.cos(a)).toFixed(1)}" x2="${(200 + r2 * Math.sin(a)).toFixed(1)}" y2="${(318 - r2 * Math.cos(a)).toFixed(1)}" stroke="#006B42" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
    }
    $('#ksTicks').innerHTML = ticks;

    $('#ksChips').addEventListener('change', (e) => {
      ks.item = SCALE_ITEMS[Number(e.target.value)];
      ks.drawn = 0;                                     // redraw everything with a little drop
      updateScale();
    });
    const range = $('#ksRange');
    range.addEventListener('input', () => { ks.kg = Number(range.value); updateScale(); });
    $('#ksAdd').addEventListener('click', () => addToCrate(ks.item.p, ks.kg));
    updateScale();
  }

  function updateScale() {
    const { p, kind } = ks.item;
    const range = $('#ksRange');
    range.value = ks.kg;
    setFill(range);

    const want = Math.round(ks.kg * 2);
    const g = $('#ksTokens');
    // tokens that already exist stay still; new ones drop in
    let html = '';
    for (let i = 0; i < want; i++) {
      const [x, y] = SLOTS[i];
      const isNew = i >= ks.drawn;
      const delay = ks.drawn === 0 ? i * 35 : (i - ks.drawn) * 60;
      html += `<g transform="translate(${x} ${y})"><g class="tk${isNew ? ' drop' : ''}" style="animation-delay:${isNew ? delay : 0}ms">${TOKEN[kind]}</g></g>`;
    }
    g.innerHTML = html;
    ks.drawn = want;

    $('#ksNeedle').style.transform = `rotate(${-90 + 180 * (ks.kg / 10)}deg)`;
    $('#ksKg').textContent = num(ks.kg) + ' kg';
    $('#ksName').textContent = `of ${p.name.toLowerCase()} at ${kes(p.price)} per kg`;
    $('#ksPrice').textContent = kes(p.price * ks.kg);
    $('#ksSvg').setAttribute('aria-label', `Kitchen scale showing ${num(ks.kg)} kilograms of ${p.name}`);
  }


  /* =========================================================
     2. PRICE TICKER
     ========================================================= */
  function buildTicker() {
    const deals = KK_PRODUCTS.filter((p) => p.was > p.price).sort((a, b) => (1 - b.price / b.was) - (1 - a.price / a.was));
    const steady = ['Cabbage', 'Carrots', 'Spinach', 'Cucumber', 'Butternut', 'Ginger'].map(prod).filter((p) => p && !(p.was > p.price));
    const list = [...deals.filter((p) => !isBasket(p)), ...steady];
    const item = (p, hidden) => {
      const cut = p.was > p.price ? `<i class="cut">&#9660; ${Math.round((1 - p.price / p.was) * 100)}%</i>` : '<i>per kg</i>';
      return `<a href="shop.html#${p.cat}" ${hidden ? 'tabindex="-1"' : ''}>${esc(p.name)} <b>${kes(p.price)}</b> ${cut}</a>`;
    };
    const once = list.map((p) => item(p, false)).join('');
    const twice = list.map((p) => item(p, true)).join('');
    $('#tickerTrack').innerHTML = once + `<span aria-hidden="true" style="display:contents">${twice}</span>`;
  }


  /* =========================================================
     3. CATEGORY TILES
     ========================================================= */
  function buildTiles() {
    const thumbs = ['sukumawiki', 'spinach', 'kales'];
    $('#tiles').innerHTML = CATS.map((c, i) => {
      const n = KK_PRODUCTS.filter((p) => p.cat === c.id).length;
      const photos = i === 0 && c.photos
        ? `<div class="tile-photos" aria-hidden="true">${thumbs.map((t) => `<span><img src="${imgSrc(t, 0)}" data-img="${t}" data-try="0" alt="" loading="lazy"></span>`).join('')}</div>`
        : '';
      return `<a class="tile tile--${i}" href="shop.html#${c.id}" style="--tint:${c.tint}">
        <span class="tile-count">${n} items</span>
        <h3>${esc(c.name)}</h3>
        <p>${esc(c.blurb)}</p>
        <span class="tile-go">Shop ${esc(c.name.toLowerCase())}</span>
        ${photos}
      </a>`;
    }).join('');
  }


  /* =========================================================
     4. BUDGET STRETCHER
     ========================================================= */
  const BUDGET_ITEMS = ['Sukuma wiki', 'Cabbage', 'Irish potatoes', 'Tomatoes', 'Carrots', 'Red onions'].map(prod).filter(Boolean);
  const baskets = KK_PRODUCTS.filter((p) => isBasket(p) && p.stock > 0).sort((a, b) => a.price - b.price);

  function renderBudget() {
    const range = $('#budRange');
    const budget = Number(range.value);
    setFill(range);
    $('#budVal').textContent = kes(budget);

    const kgs = BUDGET_ITEMS.map((p) => budget / p.price);
    const max = Math.max(...kgs);
    $('#budRows').innerHTML = BUDGET_ITEMS.map((p, i) => `
      <li class="bud-row">
        <div><b>${esc(p.name)}</b><small>${kes(p.price)} per kg</small></div>
        <output>${kgs[i].toFixed(kgs[i] >= 10 ? 0 : 1)} kg</output>
        <div class="bud-bar" aria-hidden="true"><i style="width:${(kgs[i] / max) * 100}%"></i></div>
      </li>`).join('');

    const fit = [...baskets].reverse().find((b) => b.price <= budget);
    $('#budBasket').innerHTML = fit
      ? `<small>Best basket for this budget</small><b>${esc(fit.name)} · ${kes(fit.price)}</b><span>${esc(fit.note)}</span>
         <button type="button" class="add" data-basket="${fit.id}">Add basket to crate</button>`
      : `<small>Ready-made baskets</small><b>Slide up a little</b><span>Our baskets start at ${kes(baskets[0] ? baskets[0].price : 300)}.</span>`;
  }
  function buildBudget() {
    $('#budRange').addEventListener('input', renderBudget);
    $('#budBasket').addEventListener('click', (e) => {
      const b = e.target.closest('[data-basket]');
      if (b) addToCrate(KK_PRODUCTS.find((p) => p.id === b.dataset.basket), 1);
    });
    renderBudget();
  }


  /* =========================================================
     5. DINNER ROULETTE
     ========================================================= */
  const MEALS = [
    ['Sukuma and ugali night', [['Sukuma wiki', 1], ['Tomatoes', 0.5], ['Red onions', 0.5]]],
    ['Kachumbari party', [['Tomatoes', 1], ['Red onions', 0.5], ['Coriander (Dhania)', 0.25]]],
    ['Pilau Sunday', [['Red onions', 1], ['Garlic', 0.25], ['Irish potatoes', 1]]],
    ['Githeri comfort', [['Carrots', 0.5], ['Tomatoes', 0.5], ['Red onions', 0.5]]],
    ['Green smoothie morning', [['Spinach', 1], ['Cucumber', 0.5], ['Mint', 0.25]]],
    ['Roast tray supper', [['Butternut', 1], ['Red onions', 0.5], ['Baby potatoes', 1]]],
    ['Quick stir-fry', [['French beans', 0.5], ['Red capsicum', 0.5], ['Carrots', 0.5]]],
    ['Saucy stew', [['Irish potatoes', 1], ['Carrots', 0.5], ['Tomatoes', 0.5]]]
  ].map(([name, items]) => ({ name, items: items.map(([n, kg]) => ({ p: prod(n), kg })) })).filter((m) => m.items.every((i) => i.p));

  const pool = KK_PRODUCTS.filter((p) => !isBasket(p) && p.stock > 0);
  const slot = { spinning: false, last: -1, meal: null };

  const cellHTML = (p) => `<div class="cell"><i style="background:${catById.get(p.cat).tint};box-shadow:inset 0 0 0 3px #BFE6D2"></i><span>${esc(p.name)}</span></div>`;

  function buildRoulette() {
    if (!MEALS.length) { $('#roulette').hidden = true; return; }
    $$('.reel-strip').forEach((s) => { s.innerHTML = `<div class="cell"><i style="background:#E6F6EE"></i><span>?</span></div>`; });
    const go = () => spin();
    $('#spinBtn').addEventListener('click', go);
    $('#lever').addEventListener('click', go);
    $('#mealAdd').addEventListener('click', () => {
      if (!slot.meal) return;
      let added = 0;
      slot.meal.items.forEach((i) => { if (addToCrate(i.p, i.kg, true)) added++; });
      toast(added ? `${slot.meal.name}: ${added} items added` : 'Those are all sold out for now', added > 0);
    });
  }

  function spin() {
    if (slot.spinning) return;
    slot.spinning = true;
    let i; do { i = Math.floor(Math.random() * MEALS.length); } while (i === slot.last && MEALS.length > 1);
    slot.last = i;
    const meal = MEALS[i];

    $('#slot').classList.add('is-spinning');
    $('#mealName').textContent = 'Spinning…';
    $('#mealList').innerHTML = '';
    $('#mealTotal').textContent = '';
    $('#mealAdd').disabled = true;

    $$('.reel').forEach((reel, r) => {
      const strip = $('.reel-strip', reel);
      const cellH = parseFloat(getComputedStyle(reel).getPropertyValue('--cell')) || 96;
      const faces = Array.from({ length: 16 }, () => pool[Math.floor(Math.random() * pool.length)]);
      faces.push(meal.items[r].p);
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.innerHTML = faces.map(cellHTML).join('');
      void strip.offsetHeight;                          // restart the animation
      strip.style.transition = `transform ${1.5 + r * 0.55}s cubic-bezier(.17,.72,.2,1)`;
      strip.style.transform = `translateY(${-(faces.length - 1) * cellH}px)`;
    });

    setTimeout(() => {
      slot.meal = meal;
      slot.spinning = false;
      $('#slot').classList.remove('is-spinning');
      const h = $('#mealName');
      h.textContent = meal.name;
      h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop');
      $('#mealList').innerHTML = meal.items.map((it) => `<li>${num(it.kg)} kg ${esc(it.p.name)}<span>${kes(it.p.price * it.kg)}</span></li>`).join('');
      $('#mealTotal').textContent = `Whole crate: ${kes(meal.items.reduce((s, it) => s + it.p.price * it.kg, 0))}`;
      $('#mealAdd').disabled = false;
    }, 1500 + 2 * 550 + 200);
  }


  /* =========================================================
     6. JOURNEY (the route draws itself as you scroll)
     ========================================================= */
  function buildJourney() {
    const jr = $('#jr'), draw = $('#jrDraw'), truck = $('#jrTruck'), base = $('#jrBase');
    const stops = $$('.jr-stop', jr);
    const len = draw.getTotalLength();
    draw.style.strokeDasharray = len;
    draw.style.strokeDashoffset = len;

    // put each stop on the path
    stops.forEach((s, i) => {
      const pt = base.getPointAtLength(len * (0.03 + (0.94 * i) / (stops.length - 1)));
      s.style.setProperty('--lx', (pt.x / 10) + '%');
      s.style.setProperty('--ty', (pt.y / 4) + '%');
    });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = jr.getBoundingClientRect();
      const vh = window.innerHeight;
      let p = reduce ? 1 : (vh * 0.78 - r.top) / (r.height + vh * 0.25);
      p = Math.min(1, Math.max(0, p));
      jr.style.setProperty('--p', p.toFixed(3));
      draw.style.strokeDashoffset = len * (1 - p);
      const at = len * p, a = base.getPointAtLength(at), b = base.getPointAtLength(Math.min(len, at + 2));
      const angle = Math.max(-25, Math.min(25, Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI));
      truck.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
      stops.forEach((s, i) => s.classList.toggle('on', p >= (i / (stops.length - 1)) * 0.94 + 0.02));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }


  /* ---------- Start ---------- */
  buildScale();
  buildTicker();
  buildTiles();
  buildBudget();
  buildRoulette();
  buildJourney();
})();
