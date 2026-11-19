# Tabata — oma rytmi

Suomenkielinen, mobiili ensin suunniteltu Tabata-ajastin. Staattinen PWA: ei palvelinta, kirjautumista, analytiikkaa, ulkoisia fontteja eikä ajonaikaisia CDN-riippuvuuksia. Toimii myös GitHub Pagesin `/tabata-timer/`-alipolussa.

## Treeni

Oletuksena **10 s valmistautuminen + 8 × 20 s työ + 7 × 10 s lepo = 4 minuuttia**. Valmistautuminen on erillinen vaihe. Lepo on vain kierrosten välissä; viimeisen työjakson jälkeen treeni päättyy heti.

- **Aloita treeni**, **Keskeytä**, **Jatka treeniä**, **Nollaa** ja lopuksi **Uusi treeni**.
- Kierrokset 1–99, työ 1–3600 s, lepo ja valmistautuminen 0–3600 s. Nolla ohittaa levon tai valmistautumisen.
- Asetukset ja äänivalinta tallentuvat selaimen `localStorage`-muistiin. Kesken oleva treeni ei tallennu. Muokkaus on estetty käynnissä olevan ja keskeytetyn treenin aikana; nollaa ensin.
- Äänet ovat oletuksena pois. Valinnainen Web Audio -äänimerkki vaiheenvaihdossa ja viimeisillä kolmella sekunnilla. Äänet avataan käyttäjän painalluksesta; ei äänitiedostoja eikä verkkopyyntöjä.
- Isot numerot, kontrastikas tumma/vihreä näkymä, vaiheesta riippuva korostus, näppäimistökäyttö, näkyvä kohdistus, nimetty lomake ja rauhalliset ruudunlukijailmoitukset. Vaihe ilmaistaan tekstillä, ei vain värillä.

## Asennus ja offline

Avaa sovellus HTTPS-osoitteessa ja odota **Valmis offline-käyttöön** -ilmoitusta.

- **iPhone / iPad:** Safari → Jaa → Lisää Koti-valikkoon.
- **Android:** selaimen valikko → Asenna sovellus / Lisää aloitusnäyttöön. Sovellus näyttää asennuspainikkeen, jos selain tarjoaa asennustapahtuman.
- **Tietokone:** selaimen asennuskuvake, jos tuettu.

Service worker tallentaa sovelluskuoren ja PNG-kuvakkeet. Kaikki polut ovat suhteellisia; manifestin `scope`, `start_url` ja `id` ovat `./`. Sovellus ei vaadi koontivaihetta. Offline edellyttää onnistunutta ensilatausta ja selaimen säilyttämää välimuistia; selain voi poistaa tallennuksen.

### Turvalliset päivitykset

Uusi service worker jää odottamaan. **Päivitä sovellus** on käytettävissä vain ennen treeniä, nollauksen jälkeen tai treenin päätyttyä — ei myöskään keskeytyksen aikana. Vain oma, käyttäjän käynnistämä päivitys lataa sivun uudelleen. Toisen välilehden aktivoima päivitys ei lataa tämän välilehden treeniä uudelleen. Sulje tarpeettomat välilehdet ennen päivittämistä.

Kun muutat julkaistavia tiedostoja, vaihda `sw.js`-tiedoston `VERSION` (esim. `v1` → `v2`), jotta välimuisti päivittyy. Välimuistin nimi sisältää sovelluksen scopen: muiden samalla domainilla olevien sovellusten välimuisteja ei poisteta.

## Näytön hereilläpito ja rajat

Screen Wake Lock -lukkoa pyydetään vain käynnissä olevalle treenille. Lukko vapautetaan keskeytyksessä, nollauksessa, treenin päättyessä ja sivun piiloutuessa. Sitä pyydetään uudelleen sivun palatessa näkyviin. Myöhässä valmistuva pyyntö vapautetaan, jos treeni ehti pysähtyä; nopea jatkaminen ei jätä vanhaa lukkoa eloon.

Tilateksti kertoo, onko lukko aktiivinen. Tuen puuttuessa, pyynnön epäonnistuessa tai lukon vapautuessa näytetään selkeä **Näyttö voi sammua** -varoitus. Uudelleenyrityspainike on käytettävissä tuetuissa selaimissa.

**Hereilläpitoa ei voi taata.** Selain, käyttöjärjestelmä tai virransäästö voi vapauttaa lukon. Pidä sovellus näkyvissä ja testaa omalla laitteellasi ennen treeniä. HTTPS (tai paikallinen localhost) on tarpeen. Asentaminen PWA:ksi ei poista käyttöjärjestelmän rajoja.

Ajastin laskee aikaa aikaleimojen perusteella, ei vähentämällä sekuntia jokaisella callbackilla. Myöhästynyt callback hyppää suoraan oikeaan vaiheeseen. Taustalla, lukitulla näytöllä tai laitteen nukkuessa callbackit ja äänet voivat keskeytyä; palatessa näkymä korjaantuu. Ohitettuja äänimerkkejä ei toisteta jonona. Laitteen kellon manuaalinen muuttaminen kesken treenin voi muuttaa jäljellä olevaa aikaa. Sivun sulkeminen tai uudelleenlataus nollaa treenin. Tämä ei ole taustalla toimiva hälytyssovellus.

## Kehitys ja testaus

Tarvitset Node.js:n (testattu Node 26) ja npm:n. Tuotantosovellus ei tarvitse Nodea.

```sh
npm ci
npx playwright install chromium
npm test
npm run test:e2e
npm run dev
```

Paikallinen osoite: `http://127.0.0.1:4173/tabata-timer/`. Testipalvelin palvelee tarkoituksella alipolusta, jotta juuripolkuun sidotut virheet paljastuvat. Älä avaa `index.html`-tiedostoa `file://`-osoitteena.

- `node --test`: oletusvaiheet, ei viimeistä lepoa, aikaleimapohjainen kiinniotto, keskeytys/jatkaminen/nollaus, validointi ja nollapituiset valinnaiset vaiheet.
- Playwright / Chromium: käyttöliittymä, asetusten tallennus, oikea offline-lataus service workerilla alipolussa, manifesti ja PNG-mitat, 320–1280 px näkymät, päivitysturva sekä Wake Lockin onnistuminen, hylkäys, tuen puute, vapautus, uudelleenpyyntö ja asynkroniset kilpailutilanteet.
- Wake Lock -testit käyttävät kontrolloitua selain-API-mockia. Ne todentavat sovelluksen logiikan, **eivät fyysisen puhelimen näytön pysymistä päällä**. Safari/iOS ja Android-laitteen oikea asennus, äänentoisto sekä virransäästö tulee vielä testata laitteella.

Kuvakkeet ovat alkuperäistä grafiikkaa. Luo ne uudelleen ilman Python-riippuvuuksia:

```sh
python3 scripts/generate-icons.py
```

## Tiedostot ja julkaisu

`index.html`, `styles.css`, `app.js` (näkymä ja äänet), `timer.js` (aikalogiikka), `wake-lock.js`, `pwa.js`, `sw.js`, `manifest.webmanifest`, `icons/`. Testit ovat `tests/`-hakemistossa. Käyttöliittymässä tai välimuistissa ei ole yksityisiä tietoja.

GitHub Pagesiin julkaistaan nämä staattiset juuritiedostot; `.nojekyll` mahdollistaa suoran staattisen julkaisun. Valitse repositorion Pages-asetuksista julkaisu `main`-haaran juuresta. **Yksityinen repository ei automaattisesti tarkoita yksityistä Pages-sivustoa:** tarkista GitHub-tilauksen julkaisumahdollisuudet ja sivuston näkyvyys erikseen. Älä lisää sovellukseen salaisuuksia. Julkaisua tai etäasetuksia ei tehdä testikomennoilla.
