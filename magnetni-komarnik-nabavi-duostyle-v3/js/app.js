(() => {
  const cfg = window.PAGE_CONFIG;
  const money = v => `${Number(v).toFixed(2).replace('.', ',')} KM`;
  let selected = '1';
  let addons = {
    warranty: false,
    priority: false,
    insurance: true
  };

  function initPixel(){
    if(!cfg.pixelId) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', cfg.pixelId);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', {content_name: cfg.productName, content_type: 'product', value: cfg.offers['1'].price, currency: cfg.currency});
  }
  initPixel();

  function addonTotal(){
    return Object.entries(addons).reduce((sum,[key,val]) => sum + (val ? cfg.addons[key].price : 0), 0);
  }

  function selectedOffer(){ return cfg.offers[selected]; }

  function updateBundles(){
    document.querySelectorAll('input[name="bundle"], input[name="bundleTop"]').forEach(input => {
      input.checked = input.value === selected;
      const label = input.closest('label');
      if(label) label.classList.toggle('selected', input.checked);
    });
    document.querySelectorAll('[data-bundle-card]').forEach(card => {
      card.classList.toggle('selected', card.getAttribute('data-bundle-card') === selected);
    });
  }

  function updateAddons(){
    document.querySelectorAll('[data-addon]').forEach(el => {
      const key = el.dataset.addon;
      el.classList.toggle('active', !!addons[key]);
      const btn = el.querySelector('[data-addon-button]');
      if(btn) btn.textContent = addons[key] ? 'Dodano' : 'Dodaj';
    });
  }

  function updateSummary(){
    const offer = selectedOffer();
    const total = offer.price + cfg.shipping + addonTotal();
    document.getElementById('sumProduct').textContent = money(offer.price);
    document.getElementById('sumSavings').textContent = offer.savings ? money(offer.savings) : '0 KM';
    document.getElementById('sumTotal').textContent = money(total);
    document.getElementById('stickyPrice').textContent = money(offer.price);

    const box = document.getElementById('addonsSummary');
    const active = Object.entries(addons).filter(([k,v])=>v);
    box.innerHTML = active.map(([key]) => `<div><span>${cfg.addons[key].name}</span><strong>${money(cfg.addons[key].price)}</strong></div>`).join('');
    updateBundles();
    updateAddons();
  }

  function chooseBundle(value){
    selected = String(value);
    updateSummary();
  }

  document.querySelectorAll('input[name="bundle"], input[name="bundleTop"]').forEach(input => {
    input.addEventListener('change', () => chooseBundle(input.value));
  });

  document.querySelectorAll('[data-addon-button]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.addonButton;
      addons[key] = !addons[key];
      updateSummary();
    });
  });

  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const ans = btn.nextElementSibling;
      ans.classList.toggle('open');
      btn.querySelector('span').textContent = ans.classList.contains('open') ? '×' : '+';
    });
  });

  // Stock random slight movement
  const stock = document.getElementById('stockCount');
  if(stock){ stock.textContent = Math.floor(Math.random()*5)+15; }

  let checkoutTracked = false;
  function trackCheckout(){
    if(checkoutTracked || !window.fbq) return;
    const offer = selectedOffer();
    fbq('track','InitiateCheckout',{
      content_name: cfg.productName,
      content_type: 'product',
      value: offer.price + cfg.shipping + addonTotal(),
      currency: cfg.currency,
      num_items: offer.qty,
      contents: [{id: cfg.productName, quantity: offer.qty, item_price: offer.price / offer.qty}]
    });
    checkoutTracked = true;
  }
  document.querySelectorAll('[data-checkout]').forEach(el => el.addEventListener('click', trackCheckout));

  const form = document.getElementById('orderForm');
  const err = document.getElementById('formError');
  const submitBtn = form.querySelector('button[type="submit"]');
  const clean = v => String(v || '').trim().replace(/[<>]/g,'');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if(data.website) return;
    const phoneDigits = clean(data.tel).replace(/\D/g,'');
    if(clean(data.ime).length < 3 || phoneDigits.length < 8 || clean(data.adresa).length < 4 || clean(data.grad).length < 2){
      err.textContent = 'Molimo unesite ispravno ime, telefon, adresu i grad.';
      return;
    }
    const offer = selectedOffer();
    const activeAddons = Object.entries(addons).filter(([k,v])=>v).map(([k]) => cfg.addons[k].name);
    const total = offer.price + cfg.shipping + addonTotal();
    const payload = {
      proizvod: cfg.productName,
      paket: offer.name,
      kolicina: offer.qty,
      cijenaPaketa: offer.price,
      usteda: offer.savings,
      dostava: cfg.shipping,
      dodaci: activeAddons.join(', ') || 'Bez dodataka',
      dodaciIznos: addonTotal(),
      ukupno: total,
      ime: clean(data.ime),
      tel: clean(data.tel),
      adresa: clean(data.adresa),
      grad: clean(data.grad),
      ptt: clean(data.ptt),
      napomena: clean(data.napomena)
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Slanje narudžbe...';

    try{
      const res = await fetch('/.netlify/functions/narudzba', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      const result = await res.json().catch(()=>({}));
      if(!res.ok || !result.success) throw new Error(result.message || 'Greška');

      if(window.fbq){
        fbq('track','Purchase',{
          content_name: cfg.productName,
          content_type: 'product',
          value: total,
          currency: cfg.currency,
          num_items: offer.qty,
          contents: [{id: cfg.productName, quantity: offer.qty, item_price: offer.price / offer.qty}]
        });
      }
      document.getElementById('successMessage').hidden = false;
      submitBtn.textContent = 'Narudžba poslana';
      form.querySelectorAll('input, textarea, button').forEach(el => { if(el.type !== 'radio') el.disabled = true; });
    }catch(ex){
      err.textContent = 'Došlo je do greške. Molimo pokušajte ponovo ili nas kontaktirajte direktno.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Pošaljite mi odmah';
    }
  });

  updateSummary();
})();