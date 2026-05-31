exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    if (!data.ime || !data.tel || !data.adresa || !data.grad) {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Nedostaju podaci.' }) };
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const RESEND_KEY = process.env.RESEND_API_KEY;

    const AIRTABLE_BASE = 'app4YidXUeN0XmIKF';
    const AIRTABLE_TABLE = 'tblgq4ZJVNfci63X3';
    const ORDER_EMAIL = 'samirsakic512@gmail.com';

    if (!AIRTABLE_TOKEN) {
      console.error('AIRTABLE_TOKEN is missing.');
      return { statusCode: 500, body: JSON.stringify({ success:false, message:'Airtable token missing.' }) };
    }

    const ukupno = Number(data.ukupno || 0).toFixed(2);
    const napomena = [
      data.napomena || '',
      `Paket: ${data.paket || ''}`,
      `Dodaci: ${data.dodaci || 'Bez dodataka'}`,
      `Dodaci iznos: ${Number(data.dodaciIznos || 0).toFixed(2)} KM`,
      `Ušteda: ${Number(data.usteda || 0).toFixed(2)} KM`,
      `Cijena paketa: ${Number(data.cijenaPaketa || 0).toFixed(2)} KM`,
      `Dostava: ${Number(data.dostava || 0).toFixed(2)} KM`,
      data.ptt ? `PTT: ${data.ptt}` : ''
    ].filter(Boolean).join(' | ');

    const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AIRTABLE_TOKEN}`
      },
      body: JSON.stringify({
        fields: {
          'Ime': data.ime,
          'Telefon': data.tel,
          'Adresa': data.adresa,
          'Grad': data.grad,
          'Proizvod': data.proizvod || 'Magnetni komarnik za vrata',
          'Količina': Number(data.kolicina || 1),
          'Ukupno': parseFloat(ukupno),
          'Status': 'Nova',
          'Napomena': napomena,
          'Datum': new Date().toISOString().split('T')[0]
        }
      })
    });

    if (!airtableResponse.ok) {
      const text = await airtableResponse.text();
      console.error('Airtable error:', text);
      return { statusCode: 500, body: JSON.stringify({ success:false, message:'Airtable error.' }) };
    }

    if (RESEND_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_KEY}`
          },
          body: JSON.stringify({
            from: 'Nabavi.ba <onboarding@resend.dev>',
            to: [ORDER_EMAIL],
            subject: `🦟 Nova narudžba – Magnetni komarnik (${data.paket || ''})`,
            html: `
              <h2>Nova narudžba – Magnetni komarnik</h2>
              <table style="border-collapse:collapse;width:100%;max-width:650px;">
                ${[
                  ['Ime', data.ime],
                  ['Telefon', data.tel],
                  ['Adresa', data.adresa],
                  ['Grad', data.grad],
                  ['PTT', data.ptt || '—'],
                  ['Paket', data.paket],
                  ['Dodaci', data.dodaci || 'Bez dodataka'],
                  ['Ušteda', `${Number(data.usteda || 0).toFixed(2)} KM`],
                  ['Ukupno', `${ukupno} KM`],
                  ['Napomena', data.napomena || '—']
                ].map(([k,v]) => `<tr><td style="padding:10px;border:1px solid #eee;background:#f7f7f7"><b>${k}</b></td><td style="padding:10px;border:1px solid #eee">${v || '—'}</td></tr>`).join('')}
              </table>
            `
          })
        });
      } catch(e) {
        console.error('Resend error:', e);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(e) {
    console.error('Function error:', e);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: 'Server error.' }) };
  }
};