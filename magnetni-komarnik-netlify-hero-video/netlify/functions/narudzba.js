const clean = (value, max = 300) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
const escapeHtml = (value) => clean(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const formatKM = (value) => `${Number(value).toFixed(2).replace('.', ',')} KM`;

// Kompatibilno s postojećim Netlify podešavanjima iz starog landinga.
// Tokeni ostaju sigurni u Environment Variables; Base/Table ID nisu tajni ključevi.
const AIRTABLE_BASE = 'app4YidXUeN0XmIKF';
const AIRTABLE_TABLE = 'tblgq4ZJVNfci63X3';
const ORDER_EMAIL = 'samirsakic512@gmail.com';
const SHIPPING_PRICE = 9.00;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  try {
    const raw = JSON.parse(event.body || '{}');

    // Honeypot: botu pokažemo uspjeh, ali ništa ne spremamo.
    if (raw.website) return { statusCode: 200, body: JSON.stringify({ success: true }) };

    const offers = {
      '1': { qty: 1, price: 16.90, label: '1 komad' },
      '2': { qty: 2, price: 29.90, label: '2 komada' },
      '3': { qty: 3, price: 39.90, label: '3 komada' }
    };
    const offer = offers[String(raw.paket)] || offers['1'];
    const total = Number((offer.price + SHIPPING_PRICE).toFixed(2));

    const order = {
      ime: clean(raw.ime, 80),
      tel: clean(raw.tel, 40),
      adresa: clean(raw.adresa, 120),
      grad: clean(raw.grad, 70),
      napomena: clean(raw.napomena, 400),
      proizvod: 'Magnetni komarnik za vrata',
      varijanta: '100 × 210 cm',
      kolicina: offer.qty,
      paket: offer.label,
      cijenaPaketa: offer.price,
      dostava: SHIPPING_PRICE,
      ukupno: total
    };

    if (
      order.ime.length < 3 ||
      order.tel.replace(/\D/g, '').length < 8 ||
      order.adresa.length < 4 ||
      order.grad.length < 2
    ) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Neispravni podaci.' }) };
    }

    const token = process.env.AIRTABLE_TOKEN;
    if (!token) throw new Error('AIRTABLE_TOKEN environment variable is missing.');

    // Koristimo samo kolone koje je imao postojeći Airtable setup, tako da korisnik
    // ne mora ručno dodavati nove kolone za bundle ponudu.
    const packageDetails = `Paket: ${order.paket}; Cijena paketa: ${formatKM(order.cijenaPaketa)}; Dostava: ${formatKM(order.dostava)}`;
    const noteWithDetails = order.napomena ? `${packageDetails}; Napomena kupca: ${order.napomena}` : packageDetails;

    const airtableRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fields: {
          'Ime': order.ime,
          'Telefon': order.tel,
          'Adresa': order.adresa,
          'Grad': order.grad,
          'Proizvod': `${order.proizvod} (${order.varijanta})`,
          'Količina': order.kolicina,
          'Ukupno': order.ukupno,
          'Status': 'Nova',
          'Napomena': noteWithDetails,
          'Datum': new Date().toISOString().split('T')[0]
        }
      })
    });

    if (!airtableRes.ok) {
      const airtableError = await airtableRes.text().catch(() => '');
      console.error('Airtable response:', airtableRes.status, airtableError);
      throw new Error(`Airtable failed: ${airtableRes.status}`);
    }

    // Email je obavijest; Airtable zapis je glavni dokaz da je narudžba spremljena.
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`
          },
          body: JSON.stringify({
            from: 'Nabavi.ba <onboarding@resend.dev>',
            to: [ORDER_EMAIL],
            subject: `Nova narudžba – Magnetni komarnik (${order.paket})`,
            html: `
              <h2 style="color:#075b47;">Nova narudžba – Magnetni komarnik za vrata</h2>
              <table style="border-collapse:collapse;width:100%;max-width:560px;">
                ${[
                  ['Ime', order.ime],
                  ['Telefon', order.tel],
                  ['Adresa', order.adresa],
                  ['Grad', order.grad],
                  ['Proizvod', `${order.proizvod} (${order.varijanta})`],
                  ['Paket', order.paket],
                  ['Cijena paketa', formatKM(order.cijenaPaketa)],
                  ['Dostava', formatKM(order.dostava)],
                  ['Ukupno', formatKM(order.ukupno)],
                  ['Napomena', order.napomena || '—']
                ].map(([label, value]) => `<tr><td style="padding:10px;border:1px solid #eee;background:#f7faf8;"><b>${label}</b></td><td style="padding:10px;border:1px solid #eee;">${escapeHtml(value)}</td></tr>`).join('')}
              </table>
              <p style="color:#888;font-size:12px;margin-top:20px;">Nabavi.ba · Magnetni komarnik za vrata</p>
            `
          })
        });
        if (!emailRes.ok) console.error('Resend response:', emailRes.status, await emailRes.text().catch(() => ''));
      } catch (emailError) {
        console.error('Resend error:', emailError);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Narudžba trenutno nije spremljena.' })
    };
  }
};
