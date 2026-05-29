const clean = (value, max = 300) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
const escapeHtml = value => clean(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ success: false }) };
  try {
    const raw = JSON.parse(event.body || '{}');
    if (raw.website) return { statusCode: 200, body: JSON.stringify({ success: true }) };
    const offers = { '1': { qty: 1, price: 16.90 }, '2': { qty: 2, price: 29.90 }, '3': { qty: 3, price: 39.90 } };
    const bundle = offers[String(raw.paket)] || offers['1'];
    const shipping = Number(process.env.SHIPPING_PRICE || 10.00);
    const total = Number((bundle.price + shipping).toFixed(2));
    const order = {
      ime: clean(raw.ime, 80), tel: clean(raw.tel, 40), adresa: clean(raw.adresa, 120), grad: clean(raw.grad, 70),
      napomena: clean(raw.napomena, 400), proizvod: 'Magnetni komarnik za vrata', varijanta: '100 × 210 cm',
      paket: String(raw.paket || '1'), kolicina: bundle.qty, cijenaPaketa: bundle.price, dostava: shipping, ukupno: total
    };
    if (order.ime.length < 3 || order.tel.replace(/\D/g, '').length < 8 || order.adresa.length < 4 || order.grad.length < 2) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Neispravni podaci.' }) };
    }
    const token = process.env.AIRTABLE_TOKEN;
    const base = process.env.AIRTABLE_BASE_ID;
    const table = process.env.AIRTABLE_TABLE_ID;
    if (!token || !base || !table) throw new Error('Airtable environment variables are missing.');
    const airtableRes = await fetch(`https://api.airtable.com/v0/${base}/${table}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields: {
        'Ime': order.ime, 'Telefon': order.tel, 'Adresa': order.adresa, 'Grad': order.grad,
        'Proizvod': `${order.proizvod} (${order.varijanta})`, 'Paket': `${order.kolicina} kom`, 'Količina': order.kolicina,
        'Cijena paketa': order.cijenaPaketa, 'Dostava': order.dostava, 'Ukupno': order.ukupno,
        'Status': 'Nova', 'Napomena': order.napomena || '', 'Datum': new Date().toISOString().split('T')[0]
      }})
    });
    if (!airtableRes.ok) throw new Error(`Airtable failed: ${airtableRes.status}`);
    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.ORDER_EMAIL;
    if (resendKey && toEmail) {
      await fetch('https://api.resend.com/emails', {
        method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${resendKey}`},
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'Nabavi.ba <onboarding@resend.dev>', to:[toEmail],
          subject: `Nova narudžba – Magnetni komarnik (${order.kolicina} kom)`,
          html: `<h2>Nova narudžba – Magnetni komarnik za vrata</h2><table style="border-collapse:collapse;width:100%;max-width:540px">${[
            ['Ime',order.ime],['Telefon',order.tel],['Adresa',order.adresa],['Grad',order.grad],['Paket',`${order.kolicina} kom`],['Napomena',order.napomena||'—'],['Ukupno',`${order.ukupno.toFixed(2)} KM`]
          ].map(([l,v])=>`<tr><td style="padding:10px;border:1px solid #eee"><b>${l}</b></td><td style="padding:10px;border:1px solid #eee">${escapeHtml(v)}</td></tr>`).join('')}</table>`
        })
      });
    }
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Narudžba trenutno nije spremljena.' }) };
  }
};
