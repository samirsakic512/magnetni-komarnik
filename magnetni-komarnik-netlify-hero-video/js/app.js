(() => {
  'use strict';
  const cfg = window.PAGE_CONFIG || { shipping: 9, currency: 'BAM' };
  const offers = {
    '1': { quantity: 1, name: '1 komad', price: 16.90 },
    '2': { quantity: 2, name: '2 komada', price: 29.90 },
    '3': { quantity: 3, name: '3 komada', price: 39.90 }
  };
  const money = value => `${Number(value).toFixed(2).replace('.', ',')} KM`;
  const packagePickers = [...document.querySelectorAll('input[name="packagePicker"]')];
  const bundleInputs = [...document.querySelectorAll('input[name="bundle"]')];
  const form = document.getElementById('orderForm');
  const error = document.getElementById('formError');
  const submit = form.querySelector('button[type="submit"]');
  let selected = '1';

  function choose(value) {
    selected = String(value);
    const offer = offers[selected];
    const total = offer.price + cfg.shipping;
    packagePickers.forEach(input => {
      input.checked = input.value === selected;
      input.closest('.package-card').classList.toggle('active', input.checked);
    });
    bundleInputs.forEach(input => {
      input.checked = input.value === selected;
      input.closest('label').classList.toggle('selected', input.checked);
    });
    document.getElementById('summaryBundle').textContent = offer.name;
    document.getElementById('summaryPrice').textContent = money(offer.price);
    document.getElementById('summaryShipping').textContent = money(cfg.shipping);
    document.getElementById('summaryTotal').textContent = money(total);
    document.getElementById('buttonTotal').textContent = money(offer.price);
    document.getElementById('stickyTotal').textContent = money(offer.price);
  }
  packagePickers.forEach(input => input.addEventListener('change', () => choose(input.value)));
  bundleInputs.forEach(input => input.addEventListener('change', () => choose(input.value)));
  choose('1');
  document.getElementById('year').textContent = new Date().getFullYear();

  function initPixel() {
    if (!cfg.pixelId || cfg.pixelId.includes('UNESI')) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.pixelId);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', {content_name: cfg.productName, content_type: 'product', contents: [{ id: cfg.productName, quantity: 1, item_price: offers['1'].price }], value: offers['1'].price, currency: cfg.currency});
  }
  initPixel();

  let checkoutTracked = false;
  function trackInitiateCheckout() {
    if (checkoutTracked || !window.fbq) return;
    const offer = offers[selected];
    const total = offer.price + cfg.shipping;
    fbq('track', 'InitiateCheckout', {
      content_name: cfg.productName,
      content_type: 'product',
      contents: [{ id: cfg.productName, quantity: offer.quantity, item_price: offer.price }],
      value: total,
      currency: cfg.currency,
      num_items: offer.quantity
    });
    checkoutTracked = true;
  }
  document.querySelectorAll('[data-track-checkout]').forEach(button => {
    button.addEventListener('click', trackInitiateCheckout);
  });

  const sanitize = text => String(text || '').trim().replace(/[<>]/g, '');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.website) return;
    const digits = (data.tel || '').replace(/\D/g, '');
    if (sanitize(data.ime).length < 3 || digits.length < 8 || sanitize(data.adresa).length < 4 || sanitize(data.grad).length < 2) {
      error.textContent = 'Molimo unesite ispravno ime, telefon, adresu i grad.';
      return;
    }
    const offer = offers[selected];
    const total = offer.price + cfg.shipping;
    const payload = {
      ime: sanitize(data.ime), tel: sanitize(data.tel), adresa: sanitize(data.adresa), grad: sanitize(data.grad),
      napomena: sanitize(data.napomena), paket: selected, kolicina: offer.quantity,
      cijenaPaketa: offer.price, dostava: cfg.shipping, ukupno: total,
      proizvod: cfg.productName, varijanta: cfg.variant, website: ''
    };
    submit.disabled = true;
    submit.textContent = 'Slanje narudžbe...';
    try {
      const response = await fetch('/.netlify/functions/narudzba', {method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'Narudžba nije spremljena.');
      if (window.fbq) {
        fbq('track', 'Purchase', {content_name: cfg.productName, content_type: 'product', contents: [{ id: cfg.productName, quantity: offer.quantity, item_price: offer.price }], value: total, currency: cfg.currency, num_items: offer.quantity});
      }
      form.querySelectorAll('input, textarea, button').forEach(el => { if (el.type !== 'radio') el.disabled = true; });
      document.getElementById('successMessage').hidden = false;
    } catch (err) {
      error.textContent = 'Došlo je do greške. Molimo pokušajte ponovo ili nas kontaktirajte direktno.';
      submit.disabled = false;
      submit.innerHTML = `Potvrdi narudžbu · <span id="buttonTotal">${money(offer.price)}</span>`;
    }
  });
})();
