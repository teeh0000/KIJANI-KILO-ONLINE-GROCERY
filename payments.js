/* =========================================================
   KIJANI KILO | PAYMENTS (the bridge between this page and your server)

   IMPORTANT: a web page can NOT move real money on its own.
   Real M-Pesa, Airtel Money, card and PayPal payments need a small
   server that holds your secret keys. A starter server is in the
   "server" folder (see server/README.md).

   MODES
     live: false  ->  DEMO. Everything works on screen, nothing is charged.
     live: true   ->  every payment is sent to your server (api below).

   The server always works out the price again from product ids,
   so a customer cannot change the amount in the browser.
   ========================================================= */
const KK_PAY = {
  live: false,                       // <- change to true when your server is running
  api: 'http://localhost:3000/api',  // <- your server address (use https:// when it is online)

  kesPerUsd: 129,                    // PayPal charges in US dollars. Update this rate (or fetch it live).
  paybill: '[Paybill]',              // shown for the manual "Paybill" option
  poll: { everyMs: 3000, timeoutMs: 90000 },

  /* "0712 345 678", "+254712345678" and "254712345678" all become 254712345678 */
  toMsisdn(phone) {
    return '254' + String(phone).replace(/\D/g, '').replace(/^(0|254)/, '');
  },
  usd(kes) { return Math.max(0.01, kes / this.kesPerUsd); },

  /* ------------------------------------------------------
     pay(method, order, data, hooks, signal)
       method : 'mpesa' | 'airtel' | 'card' | 'paypal'
       order  : { id, items:[{id,qty}], promo, customer, delivery, amount }
       data   : { phone } or { card:{number,name,exp,cvv} }
       hooks  : { status(name) }   (names: 'sent', 'waiting')
     Resolves with { status:'paid', reference } or throws an Error.
     ------------------------------------------------------ */
  async pay(method, order, data, hooks = {}, signal) {
    const say = (s) => hooks.status && hooks.status(s);

    /* ---------- DEMO MODE ---------- */
    if (!this.live) {
      if (method === 'mpesa' || method === 'airtel') {
        say('sent');   await sleep(2600, signal);
        say('waiting'); await sleep(4200, signal);
        return { status: 'paid', reference: fakeRef(method) };
      }
      if (method === 'card') {
        await sleep(2000, signal);
        if (String(data.card.number).replace(/\s/g, '') === '4000000000000002') throw new Error('Your bank declined this card. Please try another card.');
        return { status: 'paid', reference: fakeRef('card') };
      }
      await sleep(1600, signal);                       // PayPal
      return { status: 'paid', reference: fakeRef('paypal') };
    }

    /* ---------- LIVE MODE ---------- */
    if (method === 'mpesa' || method === 'airtel') {
      const start = await this._post(`/pay/${method}`, { order, phone: this.toMsisdn(data.phone) }, signal);
      say('sent');
      const t0 = Date.now();
      say('waiting');
      while (Date.now() - t0 < this.poll.timeoutMs) {
        await sleep(this.poll.everyMs, signal);
        const s = await this._get(`/pay/${method}/status/${encodeURIComponent(start.id)}`, signal);
        if (s.status === 'paid') return s;
        if (s.status === 'cancelled') throw new Error('You cancelled the payment on your phone.');
        if (s.status === 'failed') throw new Error(s.message || 'The payment did not go through.');
      }
      throw new Error('We did not get a confirmation in time. If money left your account, contact us with your order number.');
    }

    if (method === 'card') {
      const r = await this._post('/pay/card', { order, card: data.card }, signal);
      if (r.redirectUrl) { window.location.href = r.redirectUrl; return new Promise(() => {}); }   // 3-D Secure
      return r;
    }

    // PayPal: send the customer to PayPal, they come back to checkout.html?paypal=return
    const r = await this._post('/pay/paypal/create', { order, currency: 'USD' }, signal);
    window.location.href = r.approvalUrl;
    return new Promise(() => {});
  },

  /* called by checkout.js when PayPal sends the customer back */
  async capturePaypal(token, orderId) {
    if (!this.live) return { status: 'paid', reference: fakeRef('paypal') };
    return this._post('/pay/paypal/capture', { token, orderId });
  },

  async _post(path, body, signal) {
    const r = await fetch(this.api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'The payment service could not be reached. Please try again.');
    return j;
  },
  async _get(path, signal) {
    const r = await fetch(this.api + path, { signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || 'Could not check the payment.');
    return j;
  }
};

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true });
  });
}
function fakeRef(method) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)];
  return (method === 'paypal' ? 'PP-' : method === 'card' ? 'CD-' : '') + s;
}
