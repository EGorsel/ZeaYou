# Opdracht

Je bent een **Senior Front-end Engineer**, **UX Designer** en **Lead Software Architect**.

Ontwerp en implementeer een volledig nieuw **Filter Menu component** voor de ZeaYou Hotel BI applicatie.

Het nieuwe component moet qua gebruikerservaring, architectuur en codekwaliteit van **productiekwaliteit** zijn en naadloos aansluiten bij de rest van het dashboard.

Gebruik uitsluitend de meegeleverde referentieafbeeldingen als functionele inspiratie. Kopieer de styling niet letterlijk.

---

# Referenties

Gebruik onderstaande bestanden als referentie.

## Huidige pagina

`@ZeaYou-preview-deploy/index.html`

## Referentie functionaliteit

`@ZeaYou-preview-deploy/diagrams/filter_menu/Filter_menu.jpg`

Gebruik deze afbeelding uitsluitend als referentie voor de gewenste functionaliteit en globale layout.

## Referentie breedte

`@ZeaYou-preview-deploy/diagrams/filter_menu/Filder_menu_full_width.png`

Gebruik deze afbeelding uitsluitend als referentie voor de breedte van de widget.

Negeer de styling van beide voorbeelden.

De uiteindelijke styling moet volledig aansluiten op de bestaande ZeaYou BI applicatie.

---

# Doel

Ontwikkel een volledig nieuw filtermenu waarmee gebruikers eenvoudig alle dashboards kunnen filteren.

Het component moet:

- Modern ogen
- Zeer intuïtief zijn
- Responsive zijn
- Modulair zijn opgebouwd
- Eenvoudig uitbreidbaar zijn
- Los staan van de rest van de pagina
- Toekomstbestendig zijn zodat eenvoudig extra filters kunnen worden toegevoegd

---

# Layout

Het filtermenu bevindt zich boven de dashboard widgets.

Het filtermenu gebruikt de volledige beschikbare breedte van de pagina.

De widget bestaat uit twee delen.

## Header

Links wordt weergegeven:

▼ Filters

Wanneer de gebruiker op de pijl klikt:

- Klapt het filtermenu vloeiend in
- Klapt het filtermenu vloeiend uit

Gebruik hiervoor een subtiele animatie.

Voorkom abrupte overgangen.

---

## Filtersectie

Onder de header bevinden zich vier gelijke kolommen.

1. Hotels
2. Afdeling
3. Periode
4. Vergelijken met

Gebruik voldoende witruimte zodat de interface rustig en professioneel oogt.

---

# Functionaliteit

## Hotels

Toon een dropdown.

Wanneer geopend verschijnt een popover met:

- Zoekveld
- Lijst met alle hotels
- Checkbox per hotel
- Ondersteuning voor meerdere selecties
- "Alles selecteren"
- "Alles deselecteren"

Wanneer buiten de popover wordt geklikt sluit deze automatisch.

De gekozen hotels worden direct zichtbaar in het filterveld.

---

## Afdeling

Identiek aan Hotels.

Ondersteun meerdere selecties.

Voorbeeld afdelingen:

- Housekeeping
- Front Office
- F&B
- Kitchen
- Finance
- Sales
- Management
- Maintenance

---

## Periode

Toon standaard de huidige geselecteerde periode.

Bij openen verschijnt een popover.

### Snelle selecties

Boven de kalender worden badges weergegeven zoals:

- Vandaag
- Gisteren
- Deze week
- Vorige week
- Deze maand
- Vorige maand
- Laatste 30 dagen
- Laatste 90 dagen
- Dit jaar
- Vorig jaar
- Jaar tot nu (YTD)
- Aangepast

### Kalender

Onder de badges verschijnt een kalender waarmee gekozen kan worden:

- Van datum
- Tot datum

Na selectie wordt de periode direct bijgewerkt.

---

## Vergelijken met

Deze optie begint met een checkbox.

Wanneer de checkbox uit staat:

- Is de vergelijking uitgeschakeld
- Is de kalender verborgen

Wanneer de checkbox wordt aangezet verschijnt dezelfde interface als bij **Periode**.

Inclusief:

- Snelle selecties
- Kalender
- Van datum
- Tot datum

---

# Actieve filters

Onder het filtermenu verschijnt automatisch een rij met actieve filters.

Voorbeeld:

- Hotels: Hotel Bommeljé ✕
- Hotels: Strandhotel ✕
- Afdeling: Housekeeping ✕
- Periode: Januari 2025 ✕
- Vergelijking: Vorig jaar ✕

Iedere badge bevat:

- Filtercategorie
- Geselecteerde waarde
- Sluit-icoon

Wanneer de gebruiker op het kruisje klikt wordt uitsluitend die filter verwijderd.

Wanneer geen filters actief zijn wordt deze rij verborgen.

---

# Interactie

Zorg voor een hoogwaardige gebruikerservaring.

Ondersteun onder andere:

- Hover states
- Focus states
- Active states
- Keyboard navigation
- Escape sluit geopende dropdowns
- Klik buiten de widget sluit geopende dropdowns
- Slechts één dropdown tegelijk geopend
- Vloeiende animaties
- Subtiele overgangen

---

# Responsive gedrag

Desktop

Vier kolommen naast elkaar.

Tablet

Twee kolommen per rij.

Mobiel

Alle filters onder elkaar.

Actieve filterbadges wrappen automatisch naar meerdere regels.

---

# Styling

Gebruik uitsluitend de bestaande ZeaYou design language.

Respecteer:

- Kleuren
- Typografie
- Border radius
- Shadows
- Buttons
- Cards
- Iconografie
- Spacing

Gebruik **niet** de styling van de referentieafbeeldingen.

De widget moet eruitzien alsof deze altijd onderdeel is geweest van de bestaande applicatie.

---

# Architectuur

Maak van het filtermenu een volledig zelfstandig component.

Verplaats alle HTML, CSS en JavaScript uit `index.html`.

De pagina mag uitsluitend verantwoordelijk zijn voor het laden van het component.

Maak minimaal de volgende bestanden:

```
components/
└── filter-menu/
    ├── filter-menu.html
    ├── filter-menu.css
    ├── filter-menu.js
```

Wanneer de applicatie reeds een componentstructuur gebruikt, sluit hier dan op aan.

---

# Codekwaliteit

Schrijf uitsluitend moderne en onderhoudbare code.

Voorkom:

- Inline CSS
- Inline JavaScript
- Duplicate code
- Magic numbers
- Globale variabelen

Gebruik:

- Modulaire functies
- Herbruikbare componenten
- Duidelijke naamgeving
- Heldere comments waar nodig

---

# Accessibility

Ondersteun minimaal:

- ARIA-labels
- Screen readers
- Keyboard bediening
- Correcte focusvolgorde
- Voldoende kleurcontrast

---

# Performance

Het component moet:

- Snel renderen
- Zo min mogelijk DOM-updates uitvoeren
- Slechts één geopende dropdown tegelijk ondersteunen
- Efficiënt omgaan met event listeners

---

# Toekomstbestendigheid

Ontwerp het component zo dat in de toekomst eenvoudig extra filters kunnen worden toegevoegd, zoals:

- Land
- Regio
- Hoteltype
- Medewerker
- Functie
- KPI
- Databron
- Dashboard
- Vestiging

Nieuwe filters moeten zonder grote aanpassingen aan de bestaande architectuur toegevoegd kunnen worden.

---

# Acceptatiecriteria

De opdracht is pas voltooid wanneer:

- ✅ Het filtermenu volledig opnieuw is opgebouwd.
- ✅ De widget de volledige breedte van het dashboard gebruikt.
- ✅ Het menu vloeiend in- en uitklapbaar is.
- ✅ Hotels correct werkt met multi-select.
- ✅ Afdeling correct werkt met multi-select.
- ✅ Periode beschikt over snelle presets én een kalender.
- ✅ Vergelijken met beschikt over een optionele vergelijkingsperiode.
- ✅ Actieve filters als verwijderbare badges worden weergegeven.
- ✅ Het component volledig responsive is.
- ✅ De styling volledig aansluit op de ZeaYou BI applicatie.
- ✅ Alle code modulair is ondergebracht in aparte bestanden.
- ✅ `index.html` uitsluitend verantwoordelijk is voor het laden van het component.
- ✅ De code voldoet aan productiekwaliteit.

---

# Extra optimalisatie

Bouw niet simpelweg de referentie na.

Ontwerp een filtercomponent dat qua UX vergelijkbaar is met professionele BI-platformen zoals:

- Microsoft Power BI
- Tableau
- Looker Studio
- Metabase

Wanneer een interactie verbeterd kan worden ten opzichte van de referentie, kies dan voor de betere gebruikerservaring.

Het uiteindelijke resultaat moet eruitzien alsof het ontwikkeld is door een senior productteam van een modern SaaS-platform.