# route-capture-kit

Automatizē ekrānuzņēmumu un video klipu vākšanu no interaktīvām web lapām
(node-graph kartes, SVG/DOM ceļa navigācijas), lai video montāžai nevajadzētu
manuāli ierakstīt ekrānu un pēc tam griezt/labot DTS anomālijas. Dzinējs ir
vispārīgs — katrai jaunai lapai vajag tikai jaunu maršruta failu, ne jaunu kodu.

## Kāpēc šis rīks

Manuāls ekrāna ieraksts (Win+Alt+R / Game Bar / Recordly) katram video prasa
cilvēku, kas fiziski klikšķina pareizajā secībā, un rezultātā bieži nāk ar
DTS laika zīmogu anomālijām, kas prasa papildu griešanu pēcapstrādē.
Playwright var atvērt lapu, izpildīt to pašu klikšķu secību precīzi un
atkārtoti, un ierakstīt video natīvi (nevis caur ekrāna tveršanas draiveri) —
tas novērš abas problēmas vienlaicīgi.

## Piemērs

Reāls, publicēts rezultāts (OSINT Framework maršruts, 8 soļi, screenshoti +
ielādes video klips): [priekšskatījuma galerija](https://claude.ai/code/artifact/0f363352-5be7-4301-90d3-3dfbc725db56)

Šī konkrētā galerija bija vienreizējs izstrādes laika skripts. Repo iekļautais
`make-gallery.mjs` ir tā pati ideja kā atkārtoti lietojama komanda — der
jebkurai `capture-runner.mjs` izvades mapei, ne tikai šim vienam gadījumam.

## Prasības

- Node.js (jebkura nesenā LTS versija)
- [Playwright](https://playwright.dev) `^1.62` (`npm install`, tad `npx playwright install chromium`)
- `ffmpeg` pieejams `PATH` (video konvertācijai un priekšskatījuma video salikšanai)

## Uzstādīšana

```bash
git clone <šis-repo>
cd route-capture-kit
npm install
npx playwright install chromium
```

Pārbaudi, ka `ffmpeg` ir pieejams:

```bash
ffmpeg -version
```

## Ātrais starts

```bash
# 1. Pārbaudi, vai jaunā lapa vispār der šim rīkam
node scripts/check-compat.mjs https://example.com

# 2. Uzņem screenshotus pēc gatava maršruta (iekļauti 3 piemēri scripts/routes/)
node scripts/capture-runner.mjs scripts/routes/osint-full.mjs

# 3. Pārskati rezultātu kā lapu
node scripts/make-gallery.mjs raw/osint-full-capture

# 4. Vai salikt rupju priekšskatījuma video no vairākām capture mapēm
node scripts/make-preview-video.mjs raw/osint-intro-video-capture raw/osint-full-capture
```

## Rīki

### `check-compat.mjs <url>`

Ātrā savietojamības pārbaude PIRMS jauna maršruta rakstīšanas. Atbild uz
jautājumu: vai elementi ir teksta-adresējami (SVG/DOM, `click` darbība
strādās), vai lapa ir canvas/WebGL zīmējums (tad vajadzēs koordinātu
klikšķus vai cita pieeja pavisam). Izvada JSON ar mezglu skaitiem, verdiktu
un screenshotu (`raw/compat-checks/screenshot.png`).

```bash
node scripts/check-compat.mjs https://osint-framework.pages.dev/
```

### `capture-runner.mjs <route.mjs> [--video]`

Universālais dzinējs. Izpilda maršruta faila soļu sarakstu secīgi. Bez
`--video` karoga saglabā screenshotus mapē `raw/<route-nosaukums>-capture/`.
Ar `--video` ieraksta VISU maršrutu no sākuma līdz beigām kā vienu
`.webm`/`.mp4` klipu (Playwright natīvais video ieraksts, nevis ekrāna
tveršana — bez DTS anomālijām). Playwright neatbalsta patvaļīgu "sāc/beidz
ierakstu vidū", tāpēc video maršrutam jābūt savam, īsam, atsevišķam route
failam (tikai tā daļa, kur reāli kaut kas kustas).

**Soļu vārdnīca** (route faila `route` masīvā):

| Solis | Darbība |
|---|---|
| `["goto", url]` | Atver lapu |
| `["click", "teksts"]` | Klikšķina uz elementa ar šo tekstu (SVG/DOM, nav precīza sakritība) |
| `["clickxy", x, y]` | Klikšķina uz pikseļa koordinātas (canvas lapām, kur teksta klikšķi nestrādā) |
| `["wait", ms]` | Gaida fiksētu laiku |
| `["shot", "nosaukums"]` | Saglabā screenshotu ar šo nosaukumu |
| `["clicktab", "teksts", "nosaukums"]` | Klikšķina uz elementa, kas atver JAUNU cilni (ārējs links); uzņem screenshotu no jaunās cilnes, aizver to, atgriežas pie galvenās lapas |

Ja solis neizdodas, kļūdas ziņojumā redzams soļa numurs un pats solis
(`Solis 5/8 neizdevās — ["click","OpSec"] ...`), lai nav jāmin, kurā vietā
maršruts salūza.

### `make-gallery.mjs <capture-mape>`

Uzbūvē pārlūkojamu HTML galeriju (`gallery.html` tajā pašā mapē) no
jebkuras `capture-runner.mjs` izvades — visi screenshoti un video klipi
secīgi, ar numuriem un failu nosaukumiem.

### `make-preview-video.mjs <mape1> [mape2 ...]`

Saliek jau uzņemtos resursus (screenshoti + video klipi) vienā rupjā
priekšskatījuma video, mapju secībā, kāda dota komandrindā. Attēli tiek
rādīti pa 1.5s katrs. **Šis NAV gala montāža** — tikai ātrs "vai stāsts
plūst" pārbaudījums bez manuālas salikšanas Remotion/CapCut vai citā
montāžas rīkā. Rezultāts: `raw/preview-<mapes>.mp4`.

## Kā uzrakstīt jaunu maršrutu

1. `node scripts/check-compat.mjs <url>` — pārliecinies, ka lapa der.
2. Izpēti lapu manuāli, atrodi precīzus tekstus/pogas, kas jāklikšķina, un secību.
3. Uzraksti `scripts/routes/<nosaukums>.mjs`:
   ```js
   export const route = [
     ["goto", "https://piemers.lv"],
     ["wait", 1000],
     ["click", "Kaut kas"],
     ["wait", 800],
     ["shot", "01-rezultats"],
   ];
   ```
4. `node scripts/capture-runner.mjs scripts/routes/<nosaukums>.mjs`

Taimingi (`wait` vērtības) jākalibrē empīriski katrai lapai — daudzas lapas
(piem. "klikšķini, lai ieietu" ielādes ekrāni) NAV laika ziņā ierobežotas,
tās gaida īstu klikšķi, nevis pati pazūd pēc X sekundēm.

## Zināmie ierobežojumi

- **`clickxy` nav pierādīts praksē.** Vārdnīcā ir, bet visas līdzšinējās
  lapas bijušas teksta-adresējamas (SVG/DOM), tāpēc canvas-tipa lapa vēl
  nav testēta reāli.
- **Nav automātiskas atkārtošanas/retry loģikas.** Ja solis neizdodas
  (piem. lēns tīkls), skripts vienkārši krīt ar kļūdu. Apzināta izvēle —
  retry loģika pievieno sarežģītību, kas šim rīkam (personiska lietošana,
  ne CI) nav vajadzīga.
- **`check-compat.mjs` heiristika ir rupja** (canvas vs SVG teksta mezglu
  skaits). Pareizi diagnosticēja vienīgo līdz šim testēto gadījumu, bet nav
  pārbaudīta pret plašu lapu klāstu.
- **Taimingi ir cietkodēti sekundēs**, ne notikumu-balstīti (izņemot
  `clicktab`, kas gaida reālu `page` notikumu). Dažām lapām CSS
  opacity-fade animācijas nesignalizē "pabeigts" Playwright `waitFor`
  pārbaudei — tāpēc `wait` ar empīriski nomērītu laiku ir vienkāršākais
  uzticamais risinājums.
- **Noklusējuma viewport (1920×1152)** izvēlēts, lai sakristu ar konkrētu
  lejupējo Remotion video projektu. Der mainīt `VIEWPORT` konstanti
  `capture-runner.mjs` un `check-compat.mjs`, ja vajag citu izšķirtspēju.

## Mapju struktūra

```
scripts/
  check-compat.mjs
  capture-runner.mjs
  make-gallery.mjs
  make-preview-video.mjs
  routes/
    osint-framework.mjs   # screenshotu maršruts (piemērs)
    osint-full.mjs        # pilns maršruts ar clicktab soļiem (piemērs)
    osint-intro-video.mjs # video maršruts (piemērs)
raw/
  <route>-capture/        # capture-runner.mjs izvade (git ignorēts)
  compat-checks/          # check-compat.mjs izvade (git ignorēts)
  preview-<...>.mp4       # make-preview-video.mjs izvade (git ignorēts)
```

## Licence

Nav norādīta — privāts rīks. Ja plāno padarīt publisku, pievieno MIT vai
citu licenci pēc izvēles.
