exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ success:false, message:'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    if (!data.ime || !data.tel || !data.adresa || !data.grad) {
      return { statusCode: 400, body: JSON.stringify({ success:false, message:'Nedostaju podaci.' }) };
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || 'app4YidXUeN0XmIKF';
    const AIRTABLE_TABLE = process.env.AIRTABLE_TABLE_ID || 'tblgq4ZJVNfci63X3';
    const ORDER_EMAIL = process.env.ORDER_EMAIL || 'samirsakic512@gmail.com';

    const clean = (v) => String(v || '').trim();
    const toNumber = (v) => {
      const n = Number(String(v || 0).replace(',', '.').replace('$',''));
      return Number.isFinite(n) ? n : 0;
    };

    const ukupno = toNumber(data.ukupno);
    const kolicina = toNumber(data.kolicina || 1);
    const phoneText = clean(data.tel);

    const napomena = [
      clean(data.napomena),
      `Paket: ${clean(data.paket)}`,
      `Popust 5%: ${toNumber(data.popust).toFixed(2)} KM`,
      `Ušteda: ${toNumber(data.usteda).toFixed(2)} KM`,
      `Cijena paketa: ${toNumber(data.cijenaPaketa).toFixed(2)} KM`,
      `Dostava: ${toNumber(data.dostava).toFixed(2)} KM`
    ].filter(Boolean).join(' | ');

    const orderHtml = `
      <h2>Nova narudžba – Magnetni komarnik</h2>
      <table style="border-collapse:collapse;width:100%;max-width:650px;">
        ${[
          ['Ime i prezime', clean(data.ime)],
          ['Broj telefona', phoneText],
          ['Adresa', clean(data.adresa)],
          ['Grad', clean(data.grad)],
          ['Paket', clean(data.paket)],
          ['Popust', `${toNumber(data.popust).toFixed(2)} KM`],
          ['Ukupno', `${ukupno.toFixed(2)} KM`],
          ['Napomena', clean(data.napomena) || '—']
        ].map(([k,v]) => `<tr><td style="padding:10px;border:1px solid #eee;background:#f7f7f7"><b>${k}</b></td><td style="padding:10px;border:1px solid #eee">${v || '—'}</td></tr>`).join('')}
      </table>
    `;

    async function sendEmail(prefix = '') {
      if (!RESEND_KEY) return { ok:false, skipped:true };
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from:'Nabavi.ba <onboarding@resend.dev>',
            to:[ORDER_EMAIL],
            subject:`${prefix}🦟 Nova narudžba – Magnetni komarnik (${clean(data.paket)})`,
            html: orderHtml
          })
        });
        const emailText = await emailRes.text();
        if(!emailRes.ok) console.error('Resend error:', emailText);
        return { ok: emailRes.ok, text: emailText };
      } catch(e) {
        console.error('Resend exception:', e);
        return { ok:false, error:String(e) };
      }
    }

    if (!AIRTABLE_TOKEN) {
      const email = await sendEmail('[AIRTABLE TOKEN FALI] ');
      if(email.ok) return { statusCode: 200, body: JSON.stringify({ success:true, warning:'Airtable token missing, sent by email.' }) };
      return { statusCode: 500, body: JSON.stringify({ success:false, message:'AIRTABLE_TOKEN missing.' }) };
    }

    async function airtableCreate(fieldsToSend) {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${AIRTABLE_TOKEN}` },
        body: JSON.stringify({ fields: fieldsToSend, typecast: true })
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    }

    let airtable = await airtableCreate({
      'Ime i prezime': clean(data.ime),
      'Broj telefona': phoneText,
      'Adresa': clean(data.adresa),
      'Grad': clean(data.grad),
      'Proizvod': clean(data.proizvod) || 'Magnetni komarnik za vrata',
      'Količina': kolicina,
      'Ukupno': ukupno,
      'Status': 'Nova',
      'Datum': new Date().toISOString().slice(0, 10),
      'Napomena': napomena
    });

    if (!airtable.ok) {
      console.error('Airtable full insert error:', airtable.status, airtable.text);
      airtable = await airtableCreate({
        'Ime i prezime': clean(data.ime),
        'Broj telefona': phoneText,
        'Adresa': clean(data.adresa),
        'Grad': clean(data.grad),
        'Proizvod': clean(data.proizvod) || 'Magnetni komarnik za vrata',
        'Status': 'Nova',
        'Napomena': `UKUPNO: ${ukupno.toFixed(2)} KM | KOLIČINA: ${kolicina} | ${napomena}`
      });
    }

    if (!airtable.ok) {
      console.error('Airtable final insert error:', airtable.status, airtable.text);
      const email = await sendEmail('[AIRTABLE NIJE UPISAO] ');
      if(email.ok) return { statusCode: 200, body: JSON.stringify({ success:true, warning:'Airtable failed, sent by email.' }) };
      return { statusCode: 500, body: JSON.stringify({ success:false, message:'Airtable error and email fallback failed.' }) };
    }

    await sendEmail();

    return { statusCode: 200, body: JSON.stringify({ success:true }) };
  } catch(e) {
    console.error('Function error:', e);
    return { statusCode: 500, body: JSON.stringify({ success:false, message:'Server error.' }) };
  }
};
