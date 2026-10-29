/* =========================================================
   KIJANI KILO | CONTACT PAGE BEHAVIOUR
   (the header and footer still run from script.js)
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     EDIT ME: your real opening hours (Nairobi time)
     days: 0 = Sunday, 1 = Monday ... 6 = Saturday
     --------------------------------------------------------- */
  const HOURS = { open: 7, close: 19, days: [1, 2, 3, 4, 5, 6] };
  const TZ = 'Africa/Nairobi';

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hourLabel = (h) => (h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`);

  /* ---------------------------------------------------------
     1. "Open now" pill + highlight today in the hours list
     --------------------------------------------------------- */
  const nairobiNow = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, hour: Number(get('hour')), minute: Number(get('minute')) };
  };

  const updateStatus = () => {
    const pill = document.getElementById('openStatus');
    const text = document.getElementById('openText');
    if (!pill || !text) return;

    const { day, hour } = nairobiNow();
    const worksToday = HOURS.days.includes(day);
    const isOpen = worksToday && hour >= HOURS.open && hour < HOURS.close;

    pill.classList.toggle('is-open', isOpen);

    if (isOpen) {
      text.textContent = `Open now, until ${hourLabel(HOURS.close)}`;
    } else if (worksToday && hour < HOURS.open) {
      text.textContent = `Closed, opens today at ${hourLabel(HOURS.open)}`;
    } else {
      let next = 1;
      while (next <= 7 && !HOURS.days.includes((day + next) % 7)) next++;
      const label = next === 1 ? 'tomorrow' : DAY_NAMES[(day + next) % 7];
      text.textContent = `Closed, opens ${label} at ${hourLabel(HOURS.open)}`;
    }

    document.querySelectorAll('.hours li').forEach((li) => {
      const days = li.dataset.days.split(',').map(Number);
      li.classList.toggle('is-today', days.includes(day));
    });
  };
  updateStatus();
  setInterval(updateStatus, 60000);


  /* ---------------------------------------------------------
     2. Slip number and date
     --------------------------------------------------------- */
  const slipNo = document.getElementById('slipNo');
  const slipDate = document.getElementById('slipDate');
  if (slipNo) slipNo.textContent = 'No. ' + String(Math.floor(1000 + Math.random() * 9000));
  if (slipDate) {
    slipDate.textContent = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  }


  /* ---------------------------------------------------------
     3. Order number field opens for order-related topics
     --------------------------------------------------------- */
  const reveal = document.getElementById('orderReveal');
  document.querySelectorAll('input[name="topic"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const wants = radio.value === 'Order help' || radio.value === 'Delivery';
      reveal.classList.toggle('open', wants);
      const err = document.getElementById('ct-topic-err');
      if (err) err.textContent = '';
    });
  });


  /* ---------------------------------------------------------
     4. The scale: the dial weighs your message
        500 characters = 1 kg
     --------------------------------------------------------- */
  const MAX = 500;
  const msg    = document.getElementById('ct-msg');
  const needle = document.getElementById('needle');
  const fill   = document.getElementById('dialFill');
  const kgOut  = document.getElementById('kgOut');
  const kgNote = document.getElementById('kgNote');

  // draw the little tick marks around the dial
  const ticks = document.getElementById('ticks');
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i <= 10; i++) {
    const a = (-90 + i * 18) * Math.PI / 180;
    const r1 = i % 5 === 0 ? 47 : 51, r2 = 57;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('class', 'tick');
    line.setAttribute('x1', (80 + r1 * Math.sin(a)).toFixed(2));
    line.setAttribute('y1', (90 - r1 * Math.cos(a)).toFixed(2));
    line.setAttribute('x2', (80 + r2 * Math.sin(a)).toFixed(2));
    line.setAttribute('y2', (90 - r2 * Math.cos(a)).toFixed(2));
    ticks.appendChild(line);
  }

  const phrase = (p) => {
    if (p === 0)   return 'Start typing to weigh it';
    if (p < 0.2)   return 'Light as spinach';
    if (p < 0.5)   return 'About a bunch of kale';
    if (p < 0.85)  return 'Heavy as a cabbage';
    if (p < 1)     return 'Nearly a full sack';
    return 'A full 1 kg. That is plenty!';
  };

  const weigh = () => {
    const p = Math.min(msg.value.length / MAX, 1);
    needle.style.transform = `rotate(${-90 + 180 * p}deg)`;
    fill.style.strokeDashoffset = String(100 - 100 * p);
    kgOut.textContent = (p * 1).toFixed(2) + ' kg';
    kgNote.textContent = phrase(p);
  };
  msg.addEventListener('input', weigh);
  weigh();


  /* ---------------------------------------------------------
     5. Validation (plain words under each field)
     --------------------------------------------------------- */
  const isPhone = (v) => /^(?:\+254|254|0)(?:7|1)\d{8}$/.test(v.replace(/[\s-]/g, ''));
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  const checks = {
    'ct-name':    (el) => (el.value.trim().length >= 3 ? '' : 'Enter your name so we know who to reply to.'),
    'ct-contact': (el) => (isEmail(el.value) || isPhone(el.value) ? '' : 'Enter a valid email, or a phone number starting with 07 or 01.'),
    'ct-msg':     (el) => (el.value.trim().length >= 10 ? '' : 'Write at least a short sentence (10 characters).')
  };

  const validate = (el) => {
    const message = checks[el.id](el);
    document.getElementById(el.id + '-err').textContent = message;
    el.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };

  Object.keys(checks).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => { if (el.value) validate(el); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') validate(el); });
  });


  /* ---------------------------------------------------------
     6. Send  (replace the setTimeout with your real request)

       await fetch('/api/contact', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ name, contact, topic, order, message })
       });
     --------------------------------------------------------- */
  const form = document.getElementById('contactForm');
  const slip = document.getElementById('slip');
  const btn  = document.getElementById('sendBtn');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const results = Object.keys(checks).map((id) => validate(document.getElementById(id)));
    const topicChosen = form.querySelector('input[name="topic"]:checked');
    const topicErr = document.getElementById('ct-topic-err');
    topicErr.textContent = topicChosen ? '' : 'Pick the topic that fits best.';

    if (!topicChosen || results.includes(false)) {
      const firstBad = !results[0] ? 'ct-name' : !topicChosen ? null : !results[1] ? 'ct-contact' : 'ct-msg';
      (firstBad ? document.getElementById(firstBad) : form.querySelector('input[name="topic"]')).focus();
      return;
    }

    btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      const first = document.getElementById('ct-name').value.trim().split(' ')[0];
      document.getElementById('sentName').textContent = first;
      document.getElementById('stampNo').textContent = slipNo.textContent;
      slip.classList.add('is-sent');
      slip.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 900);
  });

  document.getElementById('sendAgain').addEventListener('click', () => {
    form.reset();
    weigh();
    reveal.classList.remove('open');
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    slip.classList.remove('is-sent');
    slipNo.textContent = 'No. ' + String(Math.floor(1000 + Math.random() * 9000));
    document.getElementById('ct-name').focus();
  });
})();
