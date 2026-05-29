# Magnetni komarnik za vrata — landing page

Landing page za Nabavi.ba sa bundle ponudom:
- 1 komad: 16,90 KM
- 2 komada: 29,90 KM
- 3 komada: 39,90 KM
- Testno postavljena dostava: 9,00 KM

## Brza izmjena prije objave
1. Meta Pixel ID `1175799501171686` je već postavljen u `index.html`; prije objave samo provjerite dimenziju proizvoda.
2. U `netlify/functions/narudzba.js` ili Netlify env varijabli `SHIPPING_PRICE` promijenite cijenu dostave ako nije 9 KM.
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
- `SHIPPING_PRICE` (opcionalno, podrazumijevano 9.00)

## Postavljanje
Uploadujte cijeli folder na Netlify ili povežite Git repozitorij. Funkcija se automatski poziva na `/.netlify/functions/narudzba`.


## Meta Pixel eventi
- `PageView`: pri otvaranju stranice
- `ViewContent`: pri prikazu proizvoda
- `InitiateCheckout`: pri kliku na CTA koji vodi na narudžbu (`Naruči odmah` / `Naruči odabrani paket`), maksimalno jednom po učitavanju stranice
- `Purchase`: tek nakon uspješno spremljene narudžbe, sa stvarnim ukupnim iznosom odabranog paketa + dostave

Prije puštanja oglasa testirajte evente u Meta Events Manager > Test Events.


## Izmjene u mobile/layout fix verziji
- Bundle badgevi su postavljeni u normalan layout bez preklapanja.
- Poboljšan prikaz na mobilnim širinama, uključujući hero tekst, trust red, sticky CTA i formu.
- Meta Pixel i checkout/purchase eventi ostaju uključeni.

- CTA dugme i sticky traka prikazuju samo cijenu odabranog paketa; dostava se dodaje i prikazuje tek u sažetku narudžbe unutar forme.


## Hero video izmjena
- Hero prikaz sada koristi automatski video: `assets/hero-video.mp4`.
- Video je optimizovan za web i nema zvuk; pokreće se automatski, vrti u krug i radi na mobilnim uređajima (`muted`, `playsinline`).
- `assets/hero.webp` ostaje kao poster/fallback dok se video učitava.
