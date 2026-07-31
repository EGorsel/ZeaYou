
# Workforce Efficiency

Genereer een professionele BI-dashboard visualisatie voor een hotelketen met als titel: *"Workforce Efficiency"*.

## Visualisatie

Toon een geavanceerde interactieve *heatmap-tabel* waarmee de efficiëntie van alle medewerkers binnen de organisatie inzichtelijk wordt gemaakt.

### Hiërarchische rijenstructuur

Organiseer de rijen volgens onderstaande hiërarchie:

*Locatie*
→ *Hotel*
→ *Afdeling*
→ *Medewerker*

Voorbeeld:

  - Hotel Bommeljé
    - Housekeeping
      - Jan de Vries
      - Lisa Jansen
    - Receptie
      - Mark Peters
  - Hotel Copper & Co
    - Housekeeping
      - Rina de Vries
      - Jan Jansen

De hiërarchie moet visueel inklapbaar en uitklapbaar zijn, vergelijkbaar met een matrixweergave in Power BI.

### Hiërarchische kolomstructuur

Organiseer de kolommen volgens onderstaande hiërarchie:

*Maand*
→ *Weeknummer*
→ *Dag*

Voorbeeld:

- Januari 2025
  - Week 01
    - 01 Jan
    - 02 Jan
    - 03 Jan
  - Week 02
- Februari 2025
  - Week 05
  - Week 06

Hierdoor ontstaat een matrix waarin iedere cel een efficiëntiescore van een medewerker op een specifieke dag vertegenwoordigt.

---

## Heatmap-kleuring

Gebruik een heatmap-weergave waarbij iedere cel automatisch wordt ingekleurd op basis van de behaalde efficiëntiescore ten opzichte van de ingestelde afdelingsnorm.

### Kleurregels

#### Groen

- Efficiency-score is gelijk aan of hoger dan de ingestelde threshold.
- Geeft aan dat de medewerker voldoet aan of beter presteert dan verwachting.

#### Geel

- Efficiency-score ligt iets onder de ingestelde threshold.
- Geeft aan dat beperkte verbetering gewenst is.

#### Oranje

- Efficiency-score ligt duidelijk onder de ingestelde threshold.

#### Donker rood

- Efficiency-score ligt aanzienlijk onder de ingestelde threshold.
- Direct zichtbaar als aandachtspunt.

Gebruik een vloeiende kleurtransitie van groen naar donkerrood zodat afwijkingen direct herkenbaar zijn.

Toon de numerieke efficiëntiescore ook in iedere cel.

---

## Efficiency Thresholds

Plaats linksboven in het dashboard een sectie *"Efficiency Thresholds"*.

Hier worden de minimale vereiste efficiëntiescores per afdeling weergegeven.

Voorbeeld:

| Afdeling | Threshold |
|-----------|-----------|
| Housekeeping | 85% |
| Receptie | 65% |
| F&B | 70% |
| Onderhoud | 75% |

Deze waarden zijn configureerbaar via het instellingenmenu.

---

## Filters

Plaats boven de visualisatie dezelfde filter widget zoals op de rest van index.html als wordt gebruikt. Hierbij kun je het filter voor "vergelijken met" echter achterwege laten.

Gebruikers moeten kunnen filteren op:

- Hotel(s)
- Datum
- Afdeling

Toon visueel de actieve filters boven de tabel.

---

## Instellingen

Toon een configuratiesectie *"Instellingen"* waarin zichtbaar is:

### Berekeningsmethode per afdeling

Per afdeling kan worden vastgelegd hoe de efficiency-score wordt berekend.

Voorbeelden:

#### Housekeeping

Efficiency =
Aantal schoongemaakte kamers ÷ Verwacht aantal kamers

#### Receptie

Efficiency =
Aantal afgehandelde gasten ÷ Verwacht aantal gasten

#### F&B

Efficiency =
Aantal orders verwerkt ÷ Verwacht aantal orders

#### Onderhoud

Efficiency =
Aantal afgeronde werkorders ÷ Geplande werkorders

### Thresholdbeheer

Per afdeling kan een minimale efficiency threshold worden ingesteld.

Voorbeeld:

- Housekeeping → 85%
- Receptie → 65%
- F&B → 70%
- Onderhoud → 75%

---

## Dashboarddoel

De gebruiker moet in één oogopslag kunnen zien:

- Welke medewerkers bovengemiddeld presteren.
- Welke medewerkers structureel onder de norm presteren.
- Op welke dagen afwijkingen optreden.
- Welke afdelingen het meest efficiënt zijn.
- Welke hotels extra aandacht nodig hebben.
- Hoe prestaties zich ontwikkelen over tijd.
- Waar operationele verbeteringen mogelijk zijn.

---

## Referentiestijl

Gebruik een ontwerpstijl vergelijkbaar met:

- Microsoft Fabric
- Power BI Matrix Visual
- Enterprise Workforce Analytics
- Operational Performance Dashboards

### Designvereisten

- Witte achtergrond
- Moderne zakelijke uitstraling
- Hoge informatie­dichtheid
- Strakke typografie
- Subtiele gridlijnen
- Sticky rij- en kolomkoppen
- Volledig uitgewerkt dashboardcomponent
- Hoge resolutie
- Realistische voorbeelddata
- Geen lege ruimtes

De visualisatie moet eruitzien als een professioneel workforce performance dashboard dat geschikt is voor managementrapportages binnen een internationale hotelorganisatie.

---

## Zorg ervoor dat

- De styling aansluit bij de rest van het al bestaande dashboard.
- Deze nieuwe tabel een aparte pagina binnen het Dashboard wordt en valt te betreden via het top-bar menu
- Het filter menu 
- Alle code die voor deze nieuwe visualisatie wordt geschreven wordt opgeslagen in een apart code bestand. Dit code bestand moet vervolgens binnen index.html worden aangeroepen voor het inladen van de visualisatie. 

---

Zie bijgevoegde afbeeldingen als voorbeeld. @ZeaYou-preview-deploy/diagrams/Employee Efficiency/Housekeeping efficiency/Housekeeping_efficiency_example.pn