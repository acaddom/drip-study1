# Studio 1: esperimento jsPsych

Per pubblicarlo passo passo (DataPipe, GitHub Pages, Prolific, pilota, analisi) segui [`GUIDA_jsPsych.md`](GUIDA_jsPsych.md).

## File
| File | Contenuto |
|---|---|
| `index.html` | Pagina di avvio: carica le librerie, lo stile e `study1.js` |
| `study1.js` | L'intero esperimento: configurazione, stimoli, randomizzazione, schermate, salvataggio dei dati |
| `lib/` | jsPsych 8.3.0, plugin survey 4.0.0 (SurveyJS incluso), plugin call-function 2.1.0, plugin pipe 0.6.0 (DataPipe). Tutti con licenza MIT, copiati qui per non dipendere da CDN esterni |

Il testo delle domande è identico a quello in [`../survey/study1_survey_en.md`](../survey/study1_survey_en.md) e alle versioni PsychoJS e SurveyJS.

## Come è costruito
- **Due versioni**, scelte con `CONFIG.design` in `study1.js`:
  - `"simplified"` (predefinita): 6 attributi in ordine fisso (protocollo §15);
  - `"full"`: 10 attributi, tariffa base per prima e gli altri in ordine casuale.
- Ogni schermata è un trial del plugin `survey`: domande obbligatorie, messaggi d'errore, slider della confidenza 50-100 senza valore iniziale (finché non lo si muove la risposta manca).
- Condizione estratta a caso con pesi 275 / 275 / 165, oppure forzata con `?cond=...`.
- Nel partitioned la tabella riassuntiva resta bloccata per almeno 10 secondi.
- Non si può tornare indietro. Funziona anche su smartphone, ma per coerenza con il protocollo conviene il filtro Prolific *Device: desktop*.

## Parametri nell'URL
| Parametro | Effetto |
|---|---|
| `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` | Inseriti da Prolific, salvati nei dati |
| `cond=drip` / `partitioned` / `baseline` | Forza la condizione |
| `design=simplified` / `full` | Forza la versione |
| `debug=1` | Alla fine scarica i file di dati e non reindirizza a Prolific |

## Dati
Alla fine vengono salvati due file per partecipante (su OSF tramite DataPipe, oppure scaricati in locale):
- `study1_<design>_<cond>_<PID>_<ora>_long.csv`: stesso formato della versione PsychoJS. Righe `row_type = "attr"` (una per attributo: `rating, leader, conf, add_initial, final_add, habit, price, airline, page_ms`) e una riga `row_type = "post"` con tutte le altre risposte e i tempi per schermata in JSON;
- `..._raw.json`: tutti i trial di jsPsych, come copia di sicurezza.

In R:
```r
source("studio1_analisi.R")
dd <- read_psychojs("cartella_con_i_csv")   # legge tutti i CSV della cartella: list(attr = ..., post = ...)
x  <- compute_id(dd$attr)
```

Se DataPipe non risponde (dopo un secondo tentativo), il browser del partecipante scarica i due file e la pagina finale gli chiede di inviarli tramite i messaggi di Prolific.

## Collaudo eseguito
- Esperimento completato in automatico in Chromium per le 3 condizioni × 2 versioni, anche a larghezza smartphone (390 px), con clic reali sul pulsante *Next* e trascinamento reale dello slider.
- Verificato che le risposte mancanti bloccano l'avanzamento, che il partitioned richiede 10 secondi sulla tabella, che il ripasso dello scenario compare dopo una risposta sbagliata e che "No" al consenso chiude lo studio.
- Salvataggio DataPipe provato simulando il server: con risposta positiva partono i due file; con errore c'è un secondo tentativo, poi il download locale e l'avviso nel debriefing. Il collegamento reale a DataPipe/OSF non l'ho potuto provare da qui: va controllato con il pilota (passo 6 della guida).
- I CSV prodotti entrano in `read_psychojs()` e `compute_id()` senza errori.
