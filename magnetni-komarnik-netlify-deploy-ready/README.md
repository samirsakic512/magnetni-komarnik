# Magnetni komarnik za vrata — landing page

Landing page za Nabavi.ba sa bundle ponudom:
- 1 komad: 16,90 KM
- 2 komada: 29,90 KM
- 3 komada: 39,90 KM
- Testno postavljena dostava: 10,00 KM

## Brza izmjena prije objave
1. Meta Pixel ID `1175799501171686` je već postavljen u `index.html`; prije objave samo provjerite dimenziju proizvoda.
2. U `netlify/functions/narudzba.js` ili Netlify env varijabli `SHIPPING_PRICE` promijenite cijenu dostave ako nije 10 KM.
3. Provjerite da Airtable tabela ima kolone: Ime, Telefon, Adresa, Grad, Proizvod, Paket, Količina, Cijena paketa, Dostava, Ukupno, Status, Napomena, Datum.

## Netlify environment variables
Obavezno za prihvat narudžbi:
- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_ID`

Za email notifikacije:
- `RESEND_API_KEY`
- `ORDER_EMAIL`
- `FROM_EMAIL` (opcionalno)

Za dostavu:
- `SHIPPING_PRICE` (opcionalno, podrazumijevano 10.00)

## Postavljanje
Uploadujte cijeli folder na Netlify ili povežite Git repozitorij. Funkcija se automatski poziva na `/.netlify/functions/narudzba`.


## Meta Pixel eventi
- `PageView`: pri otvaranju stranice
- `ViewContent`: pri prikazu proizvoda
- `InitiateCheckout`: pri kliku na CTA koji vodi na narudžbu (`Naruči odmah` / `Naruči odabrani paket`), maksimalno jednom po učitavanju stranice
- `Purchase`: tek nakon uspješno spremljene narudžbe, sa stvarnim ukupnim iznosom odabranog paketa + dostave

Prije puštanja oglasa testirajte evente u Meta Events Manager > Test Events.
