# Guida passo passo: lo Studio 1 in jsPsych, da zero a Prolific

Questa guida parte dalla cartella `review/jspsych/` già pronta e arriva ai dati in R. Non serve saper programmare: le uniche modifiche al codice sono valori da sostituire nella sezione `CONFIGURATION` di `study1.js`.

**Il percorso in breve**

| Passo | Cosa fai | Dove |
|---|---|---|
| 1 | Provi l'esperimento sul tuo computer | browser |
| 2 | Inserisci codici Prolific, testi etici, scale definitive | `study1.js` |
| 3 | Prepari l'archivio dei dati | OSF + DataPipe |
| 4 | Metti l'esperimento online | GitHub Pages |
| 5 | Crei lo studio | Prolific |
| 6 | Fai il pilota e controlli i dati | Prolific, OSF, R |
| 7 | Lanci la raccolta e scarichi i dati | Prolific, OSF |
| 8 | Analizzi | R |

Account necessari, tutti gratuiti tranne Prolific: **OSF**, **DataPipe**, **GitHub**, **Prolific** (ricercatore).

---

## 0. Cos'è jsPsych e cosa c'è nella cartella

jsPsych è una libreria JavaScript per esperimenti nel browser. Un esperimento è una *timeline*, cioè una lista di schermate (trial) eseguite in ordine. Qui ogni schermata usa il plugin `survey`, che disegna domande, scale Likert e slider e controlla che le risposte obbligatorie siano state date.

jsPsych non ha un server proprio: la pagina va ospitata da qualche parte (passo 4) e i dati vanno spediti a un archivio (passo 3).

```
jspsych/
├── index.html        pagina che il partecipante apre
├── study1.js         l'esperimento (l'unico file da modificare)
├── lib/              jsPsych e plugin, già inclusi: non toccare
├── README.md         descrizione tecnica
└── GUIDA_jsPsych.md  questa guida
```

Per modificare `study1.js` basta un editor di testo semplice. Consiglio **Visual Studio Code** (gratuito), che colora il codice e segnala le virgole o le virgolette mancanti. Evita Word o TextEdit in modalità testo formattato.

---

## 1. Provare l'esperimento sul tuo computer

1. Scarica l'intera cartella `jspsych/`, inclusa `lib/`.
2. Fai doppio clic su `index.html`: si apre nel browser e l'esperimento parte.
3. Per scegliere condizione e versione, aggiungi parametri alla fine dell'indirizzo nella barra del browser:
   ```
   .../index.html?cond=drip&debug=1
   .../index.html?cond=partitioned&design=full&debug=1
   .../index.html?cond=baseline&debug=1
   ```
   - `cond` forza la condizione (senza, viene estratta a caso);
   - `design=full` usa la versione a 10 attributi (senza, quella semplificata a 6);
   - `debug=1` fa scaricare i file di dati alla fine invece di reindirizzare a Prolific.
4. Completa lo studio. Nella cartella Download troverai due file: `..._long.csv` (quello per R) e `..._raw.json` (copia completa).

Se il doppio clic non funziona su qualche browser, avvia un piccolo server da terminale nella cartella e apri `http://localhost:8000/index.html`:
```
cd percorso/jspsych
python3 -m http.server 8000
```

---

## 2. Personalizzare l'esperimento

Apri `study1.js`. Tutto ciò che va cambiato prima del lancio è in cima, nella sezione `1. CONFIGURATION`, più tre testi segnaposto tra parentesi quadre.

### 2.1 Configurazione
```js
const CONFIG = {
  design: "simplified",                       // oppure "full"
  conditionWeights: { drip: 275, partitioned: 275, baseline: 165 },
  dataPipeExperimentId: "",                   // lo ottieni al passo 3
  completionUrl: "https://app.prolific.com/submissions/complete?cc=XXXXXXX",
  noConsentUrl:  "https://app.prolific.com/submissions/complete?cc=NOCONSENT",
  minOverviewSeconds: 10,
  currency: "€"
};
```
- **`design`**: la versione da usare (vedi protocollo §15 per la potenza: la semplificata richiede circa 450 per cella, la completa 300-350).
- **`conditionWeights`**: probabilità relative delle tre condizioni. Contano solo i rapporti; se crei tre studi Prolific separati (passo 5.6) non servono.
- **`completionUrl`** e **`noConsentUrl`**: sostituisci `XXXXXXX` e `NOCONSENT` con i codici che Prolific ti darà al passo 5.

### 2.2 Testi da sostituire (cerca `[Insert` nel file)
1. **Consenso informato**: il blocco `consent_text`. Puoi usare HTML semplice: `<p>` per i paragrafi, `<b>` per il grassetto, `<ul><li>` per gli elenchi.
2. **Debriefing**: nell'ultima schermata (`debrief`).
3. **Item segnaposto** di soddisfazione, equità e inganno (schermata `evaluations`) e la scala di price consciousness (schermata `habits`): sostituiscili con le scale validate. Ogni item ha un nome (`value`, ad esempio `"sat1"`) che diventa il nome della colonna nei dati: se cambi gli item, tieni nomi brevi e senza spazi.

### 2.3 Livelli degli attributi
Dopo il Pretest A, aggiorna i livelli degli attributi informativi nell'array `ATTRIBUTES` (campi `short`, cioè il valore in tabella, e `text`, la descrizione). Lo stesso vale per i prezzi dei servizi (`price`, `short`).

### 2.4 Lingua
Il questionario è in inglese. Se il campione sarà italiano, traduci i testi tra virgolette nelle sezioni 1, 4 e 5 del file senza toccare i nomi delle domande (`name`) e i valori (`value`): così i dati e lo script R restano invariati.

Dopo ogni modifica ripeti il passo 1. Se la pagina resta bianca, apri la console del browser (F12, scheda *Console*): l'errore indica il numero di riga, di solito una virgola o una virgoletta mancante.

---

## 3. Preparare l'archivio dei dati (OSF + DataPipe)

DataPipe è un servizio gratuito creato dagli sviluppatori di jsPsych: riceve i file dal browser del partecipante e li salva in un progetto OSF che controlli tu.

### 3.1 OSF
1. Crea un account su **osf.io**.
2. Crea un nuovo progetto, ad esempio *Drip pricing Study 1 – data*, e lascialo **privato**.
3. Vai su *Settings* (dal menu del tuo profilo) → *Personal access tokens* → *Create token*.
   - Nome: `DataPipe`;
   - permessi: spunta **`osf.full_write`**;
   - copia il token generato (si vede una volta sola).

### 3.2 DataPipe
1. Vai su **pipe.jspsych.org** e crea un account.
2. Nelle impostazioni dell'account incolla il token OSF del passo 3.1.
3. Clicca *Create new experiment*:
   - *Experiment title*: `drip_study1`;
   - *Enclosing OSF Project*: l'identificativo del progetto OSF, cioè le 5 lettere/cifre alla fine del suo indirizzo (`osf.io/abcde` → `abcde`);
   - *OSF Data Component Name*: ad esempio `data`. DataPipe crea questo componente dentro il progetto.
4. Nella pagina dell'esperimento appena creato:
   - attiva **Enable data collection** (finché è spento, i dati vengono rifiutati);
   - copia l'**Experiment ID** (una stringa di circa 12 caratteri).
5. In `study1.js` incollalo:
   ```js
   dataPipeExperimentId: "AbC123xYz789",
   ```

Da questo momento ogni sessione completata produce due file nel componente `data` del progetto OSF.

> **Prova in locale.** Con l'ID inserito, apri `index.html?cond=drip&debug=1` e completa lo studio: i file arrivano su OSF (e con `debug=1` vengono anche scaricati). Controlla su OSF che ci siano, poi cancellali.

---

## 4. Mettere l'esperimento online (GitHub Pages)

Serve un indirizzo pubblico da dare a Prolific. GitHub Pages è gratuito e affidabile.

1. Crea un account su **github.com**.
2. Clicca *New repository*:
   - nome: ad esempio `drip-study1`;
   - visibilità: **Public** (con l'account gratuito Pages funziona solo con repository pubblici; si vede il codice dell'esperimento, mai i dati, che stanno su OSF privato);
   - crea il repository.
3. Nella pagina del repository: *Add file* → *Upload files*. Trascina **il contenuto** della cartella `jspsych/` (cioè `index.html`, `study1.js` e la cartella `lib`), non la cartella stessa. Clicca *Commit changes*.
4. *Settings* → *Pages*:
   - *Source*: **Deploy from a branch**;
   - *Branch*: `main`, cartella `/ (root)` → *Save*.
5. Dopo uno o due minuti la pagina mostra l'indirizzo: `https://<tuo-utente>.github.io/drip-study1/`.
6. Aprilo con `?cond=drip&debug=1` in fondo e completa lo studio, per controllare che tutto funzioni online e che i file arrivino su OSF.

**Per modificare l'esperimento in seguito**: nel repository apri `study1.js`, clicca la matita, incolla la nuova versione, *Commit changes*. L'aggiornamento è online in un paio di minuti (ricarica la pagina con Ctrl+F5 per evitare la copia in cache).

**Alternative**, se preferisci: *Netlify Drop* (app.netlify.com/drop: trascini la cartella e ottieni un indirizzo, senza account GitHub); *Pavlovia*, che ospita anche esperimenti jsPsych (si caricano gli stessi file nel repository del progetto; il salvataggio resta su DataPipe, quindi non serve configurare quello di Pavlovia); *Cognition.run*, specifico per jsPsych. Il codice è lo stesso in tutti i casi.

---

## 5. Creare lo studio su Prolific

1. Su **app.prolific.com** → *New study*.
2. **Study link**: incolla l'indirizzo di GitHub Pages e scegli di registrare gli ID di Prolific **con parametri URL**. L'indirizzo finale deve essere:
   ```
   https://<tuo-utente>.github.io/drip-study1/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
   ```
3. **Completion codes**: Prolific propone un codice di completamento.
   - Copialo e mettilo in `completionUrl` al posto di `XXXXXXX`;
   - aggiungi un secondo codice per chi non dà il consenso (azione consigliata: *Request return*, cioè chiedere al partecipante di ritirarsi) e mettilo in `noConsentUrl` al posto di `NOCONSENT`;
   - ricarica `study1.js` su GitHub (passo 4) dopo averli inseriti.
4. **Filtri del campione**: *Device* = desktop; lingua fluente coerente con la lingua del questionario; eventuali criteri del protocollo (paese, età). Per evitare che le stesse persone partecipino a Studio 1 e studi successivi, usa il filtro *Exclude participants from previous studies*.
5. **Durata e compenso**: la versione semplificata dura circa 8-10 minuti, la completa 12-15. Usa la mediana del pilota per fissare il tempo stimato.
6. **Bilanciamento delle condizioni**, due possibilità:
   - **uno studio solo** con assegnazione casuale secondo `conditionWeights` (275 / 275 / 165): semplice, ma le celle finali saranno approssimative;
   - **tre studi**, uno per condizione, aggiungendo all'indirizzo `&cond=drip`, `&cond=partitioned`, `&cond=baseline`, ognuno con il numero esatto di posti. In questo caso tieni gli stessi filtri e usa *Exclude participants from previous studies* incrociato fra i tre, così nessuno partecipa due volte.
7. *Preview* per vedere lo studio come un partecipante.

---

## 6. Pilota (da non saltare)

1. Pubblica lo studio con **10-20 partecipanti**.
2. Su OSF, nel componente `data`, controlla che per ogni partecipante ci siano due file e che il numero corrisponda alle sottomissioni su Prolific.
3. Scarica i `_long.csv` e fai girare lo script R (passo 8). Controlla in particolare:
   - che le condizioni e la versione (`design`) siano quelle attese;
   - la durata (colonna `page_ms_json` e i tempi di Prolific);
   - i commenti finali (`comments`) per testi poco chiari;
   - le risposte al controllo di attenzione (`attn1` = 3 è corretta) e di comprensione (`comp1`, `comp2`).
4. Se qualcosa non va, correggi, ricarica su GitHub e ripeti il pilota. **Non includere i dati del pilota nell'analisi confermativa** se il preregistro non lo prevede.

---

## 7. Raccolta e download dei dati

1. Aumenta i posti su Prolific fino al campione preregistrato (aggiungendo una quota per le esclusioni previste dal protocollo).
2. Durante la raccolta controlla ogni tanto che su OSF arrivino file nuovi.
3. Approva le sottomissioni su Prolific (chi ha visto il debriefing con l'avviso di salvataggio fallito ti manderà i file per messaggio: salvali nella stessa cartella).
4. A fine raccolta, in DataPipe disattiva *Enable data collection*.
5. Su OSF, nel componente `data` → *Files* → icona di download sulla cartella *OSF Storage*: scarichi uno zip con tutti i file.

---

## 8. Analisi in R

1. Estrai lo zip in una cartella, ad esempio `dati_studio1/`.
2. In R:
   ```r
   source("studio1_analisi.R")
   dd <- read_psychojs("dati_studio1")   # legge tutti i CSV: list(attr = ..., post = ...)
   x  <- compute_id(dd$attr)              # indici di distorsione predecisionale
   ```
   Il nome della funzione dice "psychojs" perché è nata per quella versione, ma i CSV di jsPsych hanno esattamente lo stesso formato. I file `_raw.json` vengono ignorati: servono solo come copia di sicurezza.
3. Le esclusioni (attenzione, seconda comprensione sbagliata, tempi) si applicano con le colonne della riga `post` (`dd$post`) secondo il protocollo, poi si procede con `analyse()`.

---

## Problemi frequenti

| Problema | Causa probabile e soluzione |
|---|---|
| Pagina bianca | Errore di sintassi in `study1.js`: apri la console (F12) e guarda la riga indicata |
| Nessun file su OSF | *Enable data collection* spento in DataPipe, ID sbagliato in `dataPipeExperimentId`, oppure token OSF senza permesso `osf.full_write` |
| Su GitHub Pages si vede ancora la versione vecchia | Aspetta due minuti e ricarica con Ctrl+F5 |
| Errore 404 su GitHub Pages | Hai caricato la cartella invece del suo contenuto: `index.html` deve stare nella radice del repository |
| Il partecipante non torna su Prolific | Codice in `completionUrl` diverso da quello dello studio Prolific |
| Le celle non sono bilanciate | Normale con l'assegnazione casuale: usa tre studi separati (passo 5.6) |

## Dove trovare aiuto
- Documentazione jsPsych: jspsych.org (sezioni *Tutorials* e *Plugins → survey*).
- DataPipe: pipe.jspsych.org (pagina *Getting started*).
- Prolific: researcher-help.prolific.com (*Integrating with Prolific*, *Completion codes*).
