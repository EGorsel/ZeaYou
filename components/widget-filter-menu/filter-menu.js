// ZeaYou Hotel BI — Filter Menu component (filter-menu.js)
// Volledig zelfstandig, config-driven filtercomponent. Kent geen domeinkennis
// (geen "hotels"/"afdelingen" hardcoded) — de host-pagina (index.html) geeft
// via FilterMenu.init(options) een lijst filterconfig's mee. Nieuwe filters
// (bv. Land, Regio, Hoteltype) kunnen zonder wijziging aan dit bestand worden
// toegevoegd, mits ze een van de bestaande types gebruiken:
//   - "multiselect"        (zoekveld + checkbox-lijst, bv. Hotels/Afdeling)
//   - "daterange-preset"   (preset-badges + kalender, bv. Periode)
//   - "daterange-optional" (idem, achter een aan/uit-checkbox, bv. Vergelijken met)
//
// Verwacht dat de design tokens (--color-*, --space-*, --radius-*, --shadow-*,
// --font-*, --transition-*) al op :root staan (gezet door index.html) en dat
// filter-menu.css al via <link> geladen is.
//
// Laadt zijn eigen filter-menu.html relatief t.o.v. dit scriptbestand via fetch()
// — vereist dat de pagina over http(s) bediend wordt (net als feedback-widget.js,
// dat als ES module sowieso al geen file:// ondersteunt).
//
// Publieke API: window.FilterMenu.init(options) -> Promise<FilterMenuInstance>

(function () {
  'use strict';

  // document.currentScript is alleen betrouwbaar tijdens synchrone top-level
  // uitvoering van dit script — dus meteen vastleggen, niet pas in een .then().
  var SCRIPT_SRC = document.currentScript ? document.currentScript.src : '';
  var BASE_URL = SCRIPT_SRC ? SCRIPT_SRC.replace(/[^/]*$/, '') : './';
  var TEMPLATE_URL = BASE_URL + 'filter-menu.html';

  var COLLAPSE_STORAGE_KEY = 'zeayou-fm-collapsed';
  var CALENDAR_CELL_COUNT = 42; // 6 volledige weken — vaste rasterhoogte, geen maand-tot-maand sprong

  var WEEKDAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  var MONTHS_FULL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  var PRESET_ORDER = ['today', 'yesterday', 'this-week', 'last-week', 'this-month', 'last-month', 'last-30', 'last-90', 'this-year', 'last-year', 'ytd', 'custom'];
  var PRESET_BUTTON_LABELS = {
    'today': 'Vandaag', 'yesterday': 'Gisteren',
    'this-week': 'Deze week', 'last-week': 'Vorige week',
    'this-month': 'Deze maand', 'last-month': 'Vorige maand',
    'last-30': 'Laatste 30 dagen', 'last-90': 'Laatste 90 dagen',
    'this-year': 'Dit jaar', 'last-year': 'Vorig jaar',
    'ytd': 'Jaar tot nu (YTD)', 'custom': 'Aangepast'
  };

  /* ========================================================================
     Datum-helpers
     ====================================================================== */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function endOfDay(d) { var x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function startOfWeek(d) { var x = startOfDay(d); var day = (x.getDay() + 6) % 7; return addDays(x, -day); }
  function endOfWeek(d) { return endOfDay(addDays(startOfWeek(d), 6)); }
  function startOfMonth(d) { return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1)); }
  function endOfMonth(d) { return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
  function startOfYear(d) { return startOfDay(new Date(d.getFullYear(), 0, 1)); }
  function endOfYear(d) { return endOfDay(new Date(d.getFullYear(), 11, 31)); }
  function sameDate(a, b) { return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function isBetween(d, start, end) { return d.getTime() >= startOfDay(start).getTime() && d.getTime() <= startOfDay(end).getTime(); }
  function toISODate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseISODate(iso) {
    var p = iso.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function formatDisplayDate(d) { return pad2(d.getDate()) + '-' + pad2(d.getMonth() + 1) + '-' + d.getFullYear(); }
  function formatRangeLabel(range) { return formatDisplayDate(range.start) + ' t/m ' + formatDisplayDate(range.end); }

  /* Generieke preset-resolver — herbruikbaar door elk toekomstig daterange-filter. */
  function resolvePresetRange(presetId, referenceDate) {
    var ref = referenceDate || new Date();
    switch (presetId) {
      case 'today': return { start: startOfDay(ref), end: endOfDay(ref) };
      case 'yesterday': var y = addDays(ref, -1); return { start: startOfDay(y), end: endOfDay(y) };
      case 'this-week': return { start: startOfWeek(ref), end: endOfWeek(ref) };
      case 'last-week': var lw = addDays(startOfWeek(ref), -7); return { start: lw, end: endOfDay(addDays(lw, 6)) };
      case 'this-month': return { start: startOfMonth(ref), end: endOfMonth(ref) };
      case 'last-month': var lm = addMonths(ref, -1); return { start: startOfMonth(lm), end: endOfMonth(lm) };
      case 'last-30': return { start: startOfDay(addDays(ref, -29)), end: endOfDay(ref) };
      case 'last-90': return { start: startOfDay(addDays(ref, -89)), end: endOfDay(ref) };
      case 'this-year': return { start: startOfYear(ref), end: endOfYear(ref) };
      case 'last-year': var ly = new Date(ref.getFullYear() - 1, 0, 1); return { start: startOfYear(ly), end: endOfYear(ly) };
      case 'ytd': return { start: startOfYear(ref), end: endOfDay(ref) };
      default: return null; // 'custom' — de aanroeper levert start/end zelf aan
    }
  }

  function presetDisplayLabel(presetId, range) {
    switch (presetId) {
      case 'today': return 'Vandaag';
      case 'yesterday': return 'Gisteren';
      case 'this-week': return 'Deze week';
      case 'last-week': return 'Vorige week';
      case 'this-month': case 'last-month':
        return MONTHS_FULL[range.start.getMonth()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + range.start.getFullYear();
      case 'last-30': return 'Laatste 30 dagen';
      case 'last-90': return 'Laatste 90 dagen';
      case 'this-year': case 'last-year': return String(range.start.getFullYear());
      case 'ytd': return 'Jaar tot nu (YTD)';
      default: return formatRangeLabel(range);
    }
  }

  /* ========================================================================
     Template laden
     ====================================================================== */
  function loadWidgetNode() {
    return fetch(TEMPLATE_URL).then(function (res) {
      if (!res.ok) throw new Error('filter-menu.html kon niet geladen worden (' + res.status + ')');
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var widget = doc.querySelector('.fm-widget');
      if (!widget) throw new Error('filter-menu.html mist .fm-widget');
      return widget;
    });
  }

  /* ========================================================================
     Kleine DOM-helpers
     ====================================================================== */
  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }
  function svgChevron() {
    return '<svg class="fm-trigger-icon fm-trigger-icon--caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  }
  function svgCalendar() {
    return '<svg class="fm-trigger-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  }

  /* ========================================================================
     Popover — slechts één tegelijk open, click-outside, Escape, focus-trap
     ====================================================================== */
  function openPanel(ctx, key) {
    if (ctx.openKey === key) return;
    var fs = ctx.filterMap[key];
    if (!fs || !fs.els.trigger || fs.els.trigger.disabled) return;
    if (ctx.openKey) closePanel(ctx, ctx.openKey, { returnFocus: false });
    ctx.openKey = key;
    fs.els.panel.classList.add('fm-panel--open');
    fs.els.panel.setAttribute('aria-hidden', 'false');
    fs.els.trigger.setAttribute('aria-expanded', 'true');
    var focusTarget = fs.els.panel.querySelector('input, button');
    if (focusTarget) focusTarget.focus();
  }
  function closePanel(ctx, key, opts) {
    var fs = ctx.filterMap[key];
    if (!fs) return;
    fs.els.panel.classList.remove('fm-panel--open');
    fs.els.panel.setAttribute('aria-hidden', 'true');
    fs.els.trigger.setAttribute('aria-expanded', 'false');
    if (ctx.openKey === key) ctx.openKey = null;
    if (!opts || opts.returnFocus !== false) fs.els.trigger.focus();
  }
  function onDocumentClick(ctx, e) {
    if (!ctx.openKey) return;
    var fs = ctx.filterMap[ctx.openKey];
    if (!fs) return;
    if (fs.els.panel.contains(e.target) || fs.els.trigger.contains(e.target)) return;
    closePanel(ctx, ctx.openKey, { returnFocus: false });
  }
  function onDocumentKeydown(ctx, e) {
    if (!ctx.openKey) return;
    var fs = ctx.filterMap[ctx.openKey];
    if (!fs) return;
    if (e.key === 'Escape') { closePanel(ctx, ctx.openKey, { returnFocus: true }); return; }
    if (e.key === 'Tab') {
      var focusables = fs.els.panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  /* ========================================================================
     Kolom: multiselect (Hotels, Afdeling, en toekomstige filters)
     ====================================================================== */
  function multiselectTriggerText(fs) {
    var total = fs.config.options.length;
    var n = fs.value.length;
    if (n === 0) return 'Geen selectie';
    if (n === total) return fs.config.allLabel || 'Alle';
    if (n === 1) {
      var match = fs.config.options.filter(function (o) { return o.id === fs.value[0]; })[0];
      return match ? match.label : n + ' geselecteerd';
    }
    return n + ' van ' + total + ' geselecteerd';
  }

  function createMultiselectColumn(ctx, fs) {
    var key = fs.config.key;
    var column = el('div', 'fm-column', { 'data-filter-key': key });

    var labelId = 'fm-label-' + key;
    var label = el('span', 'fm-column-label', { id: labelId });
    label.textContent = fs.config.label;
    column.appendChild(label);

    var panelId = 'fm-panel-' + key;
    var trigger = el('button', 'fm-trigger', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': panelId });
    var triggerText = el('span', 'fm-trigger-text');
    trigger.appendChild(triggerText);
    trigger.insertAdjacentHTML('beforeend', svgChevron());
    column.appendChild(trigger);

    var panel = el('div', 'fm-panel', { id: panelId, role: 'group', 'aria-labelledby': labelId, 'aria-hidden': 'true' });

    if (fs.config.searchable) {
      var search = el('input', 'fm-search-input', { type: 'search', 'aria-label': (fs.config.searchPlaceholder || 'Zoeken') });
      search.placeholder = fs.config.searchPlaceholder || 'Zoeken…';
      panel.appendChild(search);
      fs.els = fs.els || {};
      fs.els.search = search;
    }

    var actions = el('div', 'fm-panel-actions');
    var selectAllBtn = el('button', 'fm-text-btn', { type: 'button', 'data-action': 'select-all' });
    selectAllBtn.textContent = 'Alles selecteren';
    var selectNoneBtn = el('button', 'fm-text-btn', { type: 'button', 'data-action': 'select-none' });
    selectNoneBtn.textContent = 'Alles deselecteren';
    actions.appendChild(selectAllBtn);
    actions.appendChild(selectNoneBtn);
    panel.appendChild(actions);

    var list = el('ul', 'fm-option-list', { role: 'listbox', 'aria-multiselectable': 'true' });
    fs.config.options.forEach(function (opt) {
      var li = el('li', 'fm-option');
      var optLabel = el('label', 'fm-option-label');
      var checkbox = el('input', 'fm-option-checkbox', { type: 'checkbox' });
      checkbox.value = opt.id;
      checkbox.checked = fs.value.indexOf(opt.id) !== -1;
      var span = el('span');
      span.textContent = opt.label;
      optLabel.appendChild(checkbox);
      optLabel.appendChild(span);
      li.appendChild(optLabel);
      list.appendChild(li);
    });
    panel.appendChild(list);

    var emptyState = el('p', 'fm-empty-state');
    emptyState.textContent = 'Geen resultaten';
    emptyState.hidden = true;
    panel.appendChild(emptyState);

    column.appendChild(panel);

    fs.els = fs.els || {};
    fs.els.trigger = trigger;
    fs.els.triggerText = triggerText;
    fs.els.panel = panel;
    fs.els.list = list;
    fs.els.emptyState = emptyState;

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (ctx.openKey === key) closePanel(ctx, key, { returnFocus: false });
      else openPanel(ctx, key);
    });

    list.addEventListener('change', function (e) {
      var cb = e.target.closest('.fm-option-checkbox');
      if (!cb) return;
      var next = fs.value.slice();
      var idx = next.indexOf(cb.value);
      if (cb.checked && idx === -1) next.push(cb.value);
      else if (!cb.checked && idx !== -1) next.splice(idx, 1);
      applyFilterValue(ctx, key, next);
    });

    actions.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.getAttribute('data-action') === 'select-all') {
        applyFilterValue(ctx, key, fs.config.options.map(function (o) { return o.id; }));
      } else {
        applyFilterValue(ctx, key, []);
      }
    });

    if (fs.els.search) {
      fs.els.search.addEventListener('input', function () {
        var query = fs.els.search.value.trim().toLowerCase();
        var anyVisible = false;
        list.querySelectorAll('.fm-option').forEach(function (li, i) {
          var opt = fs.config.options[i];
          var visible = !query || opt.label.toLowerCase().indexOf(query) !== -1;
          li.hidden = !visible;
          if (visible) anyVisible = true;
        });
        emptyState.hidden = anyVisible;
      });
    }

    updateMultiselectDom(fs);
    return column;
  }

  function updateMultiselectDom(fs) {
    fs.els.triggerText.textContent = multiselectTriggerText(fs);
    var checkboxes = fs.els.list.querySelectorAll('.fm-option-checkbox');
    checkboxes.forEach(function (cb) { cb.checked = fs.value.indexOf(cb.value) !== -1; });
  }

  /* ========================================================================
     Kolom: daterange-preset (Periode) en daterange-optional (Vergelijken met)
     ====================================================================== */
  function buildDateRangePanelBody(fs) {
    var wrap = el('div', 'fm-panel-body-daterange');

    var presetRow = el('div', 'fm-preset-row');
    (fs.config.presets || PRESET_ORDER).forEach(function (presetId) {
      var btn = el('button', 'fm-preset-badge', { type: 'button', 'data-preset': presetId });
      btn.textContent = PRESET_BUTTON_LABELS[presetId] || presetId;
      presetRow.appendChild(btn);
    });
    wrap.appendChild(presetRow);

    var dateInputs = el('div', 'fm-date-inputs');
    var startField = el('label', 'fm-date-field');
    var startCaption = el('span'); startCaption.textContent = 'Van';
    var startInput = el('input', 'fm-date-text', { type: 'text', readonly: 'readonly', 'data-role': 'start', 'aria-label': 'Van datum' });
    startField.appendChild(startCaption); startField.appendChild(startInput);
    var endField = el('label', 'fm-date-field');
    var endCaption = el('span'); endCaption.textContent = 'Tot';
    var endInput = el('input', 'fm-date-text', { type: 'text', readonly: 'readonly', 'data-role': 'end', 'aria-label': 'Tot datum' });
    endField.appendChild(endCaption); endField.appendChild(endInput);
    dateInputs.appendChild(startField); dateInputs.appendChild(endField);
    wrap.appendChild(dateInputs);

    var calendar = el('div', 'fm-calendar');
    var navRow = el('div', 'fm-calendar-nav');
    var prevBtn = el('button', 'fm-cal-nav-btn', { type: 'button', 'data-nav': 'prev', 'aria-label': 'Vorige maand' });
    prevBtn.textContent = '‹';
    var heading = el('span', 'fm-calendar-heading'); heading.setAttribute('aria-live', 'polite');
    var nextBtn = el('button', 'fm-cal-nav-btn', { type: 'button', 'data-nav': 'next', 'aria-label': 'Volgende maand' });
    nextBtn.textContent = '›';
    navRow.appendChild(prevBtn); navRow.appendChild(heading); navRow.appendChild(nextBtn);
    calendar.appendChild(navRow);

    var weekdays = el('div', 'fm-calendar-weekdays');
    weekdays.textContent = '';
    WEEKDAY_LABELS.forEach(function (wd) {
      var span = el('span'); span.textContent = wd; weekdays.appendChild(span);
    });
    calendar.appendChild(weekdays);

    var grid = el('div', 'fm-calendar-grid', { role: 'grid' });
    calendar.appendChild(grid);
    wrap.appendChild(calendar);

    return {
      root: wrap,
      presetRow: presetRow,
      startInput: startInput,
      endInput: endInput,
      heading: heading,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      grid: grid
    };
  }

  function renderCalendarGrid(fs) {
    var cal = fs.cal;
    var els = fs.els.calendar;
    els.heading.textContent = MONTHS_FULL[cal.monthCursor.getMonth()] + ' ' + cal.monthCursor.getFullYear();

    var today = startOfDay(new Date());
    var first = new Date(cal.monthCursor.getFullYear(), cal.monthCursor.getMonth(), 1);
    var offset = (first.getDay() + 6) % 7;
    var gridStart = addDays(first, -offset);

    var rangeStart = cal.pendingStart || fs.value.start;
    var rangeEnd = cal.selecting === 'end' && cal.pendingStart
      ? (cal.hoverDate || cal.pendingStart)
      : (cal.pendingEnd || fs.value.end);
    if (rangeStart && rangeEnd && rangeEnd.getTime() < rangeStart.getTime()) {
      var tmp = rangeStart; rangeStart = rangeEnd; rangeEnd = tmp;
    }

    els.grid.textContent = '';
    for (var i = 0; i < CALENDAR_CELL_COUNT; i++) {
      var d = addDays(gridStart, i);
      var btn = el('button', 'fm-day', { type: 'button', 'data-date': toISODate(d), tabindex: '-1' });
      btn.textContent = String(d.getDate());
      if (d.getMonth() !== cal.monthCursor.getMonth()) btn.classList.add('fm-day--muted');
      if (sameDate(d, today)) btn.classList.add('fm-day--today');
      if (rangeStart && rangeEnd && isBetween(d, rangeStart, rangeEnd)) btn.classList.add('fm-day--in-range');
      if (rangeStart && sameDate(d, rangeStart)) btn.classList.add('fm-day--range-start');
      if (rangeEnd && sameDate(d, rangeEnd)) btn.classList.add('fm-day--range-end');
      els.grid.appendChild(btn);
    }
    // Roving tabindex: precies één focusbare dag (vandaag, of de eerste van de maand).
    var focusCandidate = els.grid.querySelector('.fm-day--today') || els.grid.querySelector('.fm-day:not(.fm-day--muted)');
    if (focusCandidate) focusCandidate.setAttribute('tabindex', '0');
  }

  function updateDateRangeTexts(fs) {
    fs.els.calendar.startInput.value = fs.value.start ? formatDisplayDate(fs.value.start) : '';
    fs.els.calendar.endInput.value = fs.value.end ? formatDisplayDate(fs.value.end) : '';
    fs.els.calendar.presetRow.querySelectorAll('.fm-preset-badge').forEach(function (btn) {
      btn.classList.toggle('fm-preset-badge--active', btn.getAttribute('data-preset') === fs.value.presetId);
    });
  }

  function dateRangeTriggerText(fs) {
    return formatDisplayDate(fs.value.start) + ' — ' + formatDisplayDate(fs.value.end);
  }

  function commitDateRange(ctx, key, presetId, start, end) {
    var fs = ctx.filterMap[key];
    fs.value = fs.config.type === 'daterange-optional'
      ? { enabled: fs.value.enabled, presetId: presetId, start: start, end: end }
      : { presetId: presetId, start: start, end: end };
    fs.cal.monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    fs.cal.pendingStart = null; fs.cal.pendingEnd = null; fs.cal.hoverDate = null; fs.cal.selecting = 'start';
    fs.els.triggerText.textContent = dateRangeTriggerText(fs);
    updateDateRangeTexts(fs);
    renderCalendarGrid(fs);
    renderActiveBadges(ctx);
    emitChange(ctx, key, fs.value);
  }

  function focusDayCell(grid, date) {
    var target = grid.querySelector('[data-date="' + toISODate(date) + '"]');
    if (!target) return;
    grid.querySelectorAll('.fm-day').forEach(function (b) { b.setAttribute('tabindex', '-1'); });
    target.setAttribute('tabindex', '0');
    target.focus();
  }

  function attachDateRangeInteractions(ctx, fs) {
    var key = fs.config.key;
    var els = fs.els.calendar;

    els.presetRow.addEventListener('click', function (e) {
      var btn = e.target.closest('.fm-preset-badge');
      if (!btn) return;
      var presetId = btn.getAttribute('data-preset');
      if (presetId === 'custom') {
        fs.value = fs.config.type === 'daterange-optional'
          ? { enabled: fs.value.enabled, presetId: 'custom', start: fs.value.start, end: fs.value.end }
          : { presetId: 'custom', start: fs.value.start, end: fs.value.end };
        fs.cal.selecting = 'start'; fs.cal.pendingStart = null; fs.cal.pendingEnd = null; fs.cal.hoverDate = null;
        updateDateRangeTexts(fs);
        renderCalendarGrid(fs);
        return;
      }
      var range = resolvePresetRange(presetId, ctx.referenceDate);
      commitDateRange(ctx, key, presetId, range.start, range.end);
      closePanel(ctx, key, { returnFocus: false });
    });

    els.prevBtn.addEventListener('click', function () { fs.cal.monthCursor = addMonths(fs.cal.monthCursor, -1); renderCalendarGrid(fs); });
    els.nextBtn.addEventListener('click', function () { fs.cal.monthCursor = addMonths(fs.cal.monthCursor, 1); renderCalendarGrid(fs); });

    els.grid.addEventListener('click', function (e) {
      var cell = e.target.closest('.fm-day');
      if (!cell) return;
      var clicked = parseISODate(cell.getAttribute('data-date'));
      if (fs.cal.selecting !== 'end' || !fs.cal.pendingStart) {
        fs.cal.pendingStart = clicked; fs.cal.pendingEnd = null; fs.cal.hoverDate = null; fs.cal.selecting = 'end';
        renderCalendarGrid(fs);
      } else {
        var start = fs.cal.pendingStart, end = clicked;
        if (end.getTime() < start.getTime()) { var t = start; start = end; end = t; }
        commitDateRange(ctx, key, 'custom', startOfDay(start), endOfDay(end));
        closePanel(ctx, key, { returnFocus: false });
      }
    });

    els.grid.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('.fm-day');
      if (!cell || fs.cal.selecting !== 'end' || !fs.cal.pendingStart) return;
      fs.cal.hoverDate = parseISODate(cell.getAttribute('data-date'));
      renderCalendarGrid(fs);
    });

    els.grid.addEventListener('keydown', function (e) {
      var cell = e.target.closest('.fm-day');
      if (!cell) return;
      var deltaMap = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (Object.prototype.hasOwnProperty.call(deltaMap, e.key)) {
        e.preventDefault();
        var next = addDays(parseISODate(cell.getAttribute('data-date')), deltaMap[e.key]);
        if (next.getMonth() !== fs.cal.monthCursor.getMonth() || next.getFullYear() !== fs.cal.monthCursor.getFullYear()) {
          fs.cal.monthCursor = new Date(next.getFullYear(), next.getMonth(), 1);
          renderCalendarGrid(fs);
        }
        focusDayCell(els.grid, next);
      }
    });
  }

  function createDateRangeColumn(ctx, fs) {
    var key = fs.config.key;
    var column = el('div', 'fm-column', { 'data-filter-key': key });
    var labelId = 'fm-label-' + key;

    var checkboxGate = fs.config.type === 'daterange-optional';
    var panelId = 'fm-panel-' + key;
    var trigger, panel, compareCheckbox, compareBody;

    if (checkboxGate) {
      var toggleLabel = el('label', 'fm-compare-toggle', { id: labelId });
      compareCheckbox = el('input', 'fm-compare-checkbox', { type: 'checkbox' });
      compareCheckbox.checked = !!fs.value.enabled;
      var toggleText = el('span'); toggleText.textContent = fs.config.label;
      toggleLabel.appendChild(compareCheckbox);
      toggleLabel.appendChild(toggleText);
      column.appendChild(toggleLabel);

      compareBody = el('div', 'fm-compare-body');
      compareBody.hidden = !fs.value.enabled;
      trigger = el('button', 'fm-trigger', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': panelId });
      trigger.disabled = !fs.value.enabled;
      var triggerText1 = el('span', 'fm-trigger-text');
      trigger.appendChild(triggerText1);
      trigger.insertAdjacentHTML('beforeend', svgCalendar());
      compareBody.appendChild(trigger);
      panel = el('div', 'fm-panel fm-panel--daterange', { id: panelId, role: 'group', 'aria-labelledby': labelId, 'aria-hidden': 'true' });
      compareBody.appendChild(panel);
      column.appendChild(compareBody);
    } else {
      var label = el('span', 'fm-column-label', { id: labelId });
      label.textContent = fs.config.label;
      column.appendChild(label);
      trigger = el('button', 'fm-trigger', { type: 'button', 'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': panelId });
      var triggerText2 = el('span', 'fm-trigger-text');
      trigger.appendChild(triggerText2);
      trigger.insertAdjacentHTML('beforeend', svgCalendar());
      column.appendChild(trigger);
      panel = el('div', 'fm-panel fm-panel--daterange', { id: panelId, role: 'group', 'aria-labelledby': labelId, 'aria-hidden': 'true' });
      column.appendChild(panel);
    }

    var body = buildDateRangePanelBody(fs);
    panel.appendChild(body.root);

    fs.els = {
      trigger: trigger,
      triggerText: trigger.querySelector('.fm-trigger-text'),
      panel: panel,
      compareCheckbox: compareCheckbox,
      compareBody: compareBody,
      calendar: body
    };
    fs.cal = { monthCursor: new Date(fs.value.start.getFullYear(), fs.value.start.getMonth(), 1), selecting: 'start', pendingStart: null, pendingEnd: null, hoverDate: null };

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (ctx.openKey === key) closePanel(ctx, key, { returnFocus: false });
      else openPanel(ctx, key);
    });

    if (checkboxGate) {
      compareCheckbox.addEventListener('change', function () {
        var next = { enabled: compareCheckbox.checked, presetId: fs.value.presetId, start: fs.value.start, end: fs.value.end };
        applyFilterValue(ctx, key, next);
        if (!compareCheckbox.checked && ctx.openKey === key) closePanel(ctx, key, { returnFocus: false });
      });
    }

    attachDateRangeInteractions(ctx, fs);
    fs.els.triggerText.textContent = dateRangeTriggerText(fs);
    updateDateRangeTexts(fs);
    renderCalendarGrid(fs);
    return column;
  }

  function updateDateRangeDom(fs) {
    fs.els.triggerText.textContent = dateRangeTriggerText(fs);
    updateDateRangeTexts(fs);
    fs.cal.monthCursor = new Date(fs.value.start.getFullYear(), fs.value.start.getMonth(), 1);
    renderCalendarGrid(fs);
    if (fs.config.type === 'daterange-optional') {
      fs.els.compareCheckbox.checked = !!fs.value.enabled;
      fs.els.compareBody.hidden = !fs.value.enabled;
      fs.els.trigger.disabled = !fs.value.enabled;
    }
  }

  /* ========================================================================
     Generieke waarde-toepassing + events
     ====================================================================== */
  function applyFilterValue(ctx, key, newValue) {
    var fs = ctx.filterMap[key];
    if (!fs) return;
    fs.value = newValue;
    if (fs.config.type === 'multiselect') updateMultiselectDom(fs);
    else updateDateRangeDom(fs);
    renderActiveBadges(ctx);
    emitChange(ctx, key, newValue);
  }

  function getState(ctx) {
    var state = {};
    ctx.order.forEach(function (key) {
      var fs = ctx.filterMap[key];
      state[key] = fs.config.type === 'multiselect' ? fs.value.slice() : {
        presetId: fs.value.presetId,
        start: fs.value.start,
        end: fs.value.end,
        enabled: fs.config.type === 'daterange-optional' ? !!fs.value.enabled : undefined
      };
    });
    return state;
  }

  function emitChange(ctx, changedKey, value) {
    ctx.root.dispatchEvent(new CustomEvent('filtermenu:change', {
      bubbles: true,
      detail: { state: getState(ctx), changedKey: changedKey, value: value }
    }));
  }
  function emitReady(ctx) {
    ctx.root.dispatchEvent(new CustomEvent('filtermenu:ready', {
      bubbles: true,
      detail: { state: getState(ctx) }
    }));
  }

  /* ========================================================================
     Actieve-filterbadges — volledig afgeleid van state
     ====================================================================== */
  function renderActiveBadges(ctx) {
    ctx.badgesEl.textContent = '';
    var count = 0;

    ctx.order.forEach(function (key) {
      var fs = ctx.filterMap[key];
      if (fs.config.type === 'multiselect') {
        var total = fs.config.options.length;
        if (fs.value.length === total) return; // "alle" geselecteerd -> geen badge nodig
        if (fs.value.length === 0) {
          count += addBadge(ctx, fs.config.badgeCategoryLabel, 'geen selectie', function () {
            applyFilterValue(ctx, key, fs.config.options.map(function (o) { return o.id; }));
          });
          return;
        }
        fs.value.forEach(function (id) {
          var opt = fs.config.options.filter(function (o) { return o.id === id; })[0];
          count += addBadge(ctx, fs.config.badgeCategoryLabel, opt ? opt.label : id, function () {
            applyFilterValue(ctx, key, fs.value.filter(function (v) { return v !== id; }));
          });
        });
      } else if (fs.config.type === 'daterange-preset') {
        var range = { start: fs.value.start, end: fs.value.end };
        count += addBadge(ctx, fs.config.badgeCategoryLabel, presetDisplayLabel(fs.value.presetId, range), function () {
          var defaultPreset = (fs.config.value && fs.config.value.presetId) || 'this-month';
          var def = resolvePresetRange(defaultPreset, ctx.referenceDate);
          commitDateRange(ctx, key, defaultPreset, def.start, def.end);
        });
      } else if (fs.config.type === 'daterange-optional' && fs.value.enabled) {
        var cmpRange = { start: fs.value.start, end: fs.value.end };
        count += addBadge(ctx, fs.config.badgeCategoryLabel, presetDisplayLabel(fs.value.presetId, cmpRange), function () {
          applyFilterValue(ctx, key, { enabled: false, presetId: fs.value.presetId, start: fs.value.start, end: fs.value.end });
        });
      }
    });

    ctx.badgesEl.hidden = count === 0;
  }

  function addBadge(ctx, categoryLabel, valueLabel, onRemove) {
    var li = el('li', 'fm-badge');
    var strong = el('strong'); strong.textContent = categoryLabel + ':';
    var span = el('span'); span.textContent = ' ' + valueLabel;
    var removeBtn = el('button', 'fm-badge-remove', { type: 'button', 'aria-label': 'Verwijder filter ' + categoryLabel + ': ' + valueLabel });
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', onRemove);
    li.appendChild(strong); li.appendChild(span); li.appendChild(removeBtn);
    ctx.badgesEl.appendChild(li);
    return 1;
  }

  /* ========================================================================
     Filter-state normalisatie + kolom-dispatch
     ====================================================================== */
  function normalizeFilterConfig(config, referenceDate) {
    var fs = { config: config };
    if (config.type === 'multiselect') {
      fs.value = (config.value || []).slice();
    } else {
      var v = config.value || {};
      var presetId = v.presetId || (config.presets || PRESET_ORDER)[0];
      var range = (v.start && v.end) ? { start: v.start, end: v.end } : resolvePresetRange(presetId, referenceDate);
      fs.value = config.type === 'daterange-optional'
        ? { enabled: v.enabled !== false, presetId: presetId, start: range.start, end: range.end }
        : { presetId: presetId, start: range.start, end: range.end };
    }
    return fs;
  }

  function createColumn(ctx, fs) {
    return fs.config.type === 'multiselect' ? createMultiselectColumn(ctx, fs) : createDateRangeColumn(ctx, fs);
  }

  /* ========================================================================
     Collapse-toggle
     ====================================================================== */
  function setCollapsed(ctx, collapsed) {
    ctx.widgetEl.classList.toggle('fm-widget--collapsed', collapsed);
    ctx.toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    try { localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) { /* privémodus etc. — negeren */ }
  }

  /* ========================================================================
     Publieke init
     ====================================================================== */
  function init(options) {
    if (!options || !(options.root instanceof HTMLElement)) {
      return Promise.reject(new Error('FilterMenu.init vereist options.root (HTMLElement)'));
    }
    var ctx = {
      root: options.root,
      referenceDate: options.referenceDate || new Date(),
      openKey: null,
      order: [],
      filterMap: {}
    };

    return loadWidgetNode().then(function (widgetNode) {
      options.root.appendChild(widgetNode);

      ctx.widgetEl = widgetNode;
      ctx.toggleBtn = widgetNode.querySelector('[data-fm="toggleBtn"]');
      ctx.collapseEl = widgetNode.querySelector('[data-fm="collapse"]');
      ctx.columnsEl = widgetNode.querySelector('[data-fm="columns"]');
      ctx.badgesEl = widgetNode.querySelector('[data-fm="activeFilters"]');

      (options.filters || []).forEach(function (config) {
        var fs = normalizeFilterConfig(config, ctx.referenceDate);
        ctx.filterMap[config.key] = fs;
        ctx.order.push(config.key);
      });

      ctx.order.forEach(function (key) {
        ctx.columnsEl.appendChild(createColumn(ctx, ctx.filterMap[key]));
      });
      renderActiveBadges(ctx);

      var storedCollapsed = false;
      try { storedCollapsed = localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'; } catch (e) { /* negeren */ }
      setCollapsed(ctx, storedCollapsed);
      ctx.toggleBtn.addEventListener('click', function () {
        setCollapsed(ctx, !ctx.widgetEl.classList.contains('fm-widget--collapsed'));
      });

      ctx._onDocClick = function (e) { onDocumentClick(ctx, e); };
      ctx._onDocKeydown = function (e) { onDocumentKeydown(ctx, e); };
      document.addEventListener('click', ctx._onDocClick);
      document.addEventListener('keydown', ctx._onDocKeydown);

      emitReady(ctx);

      return {
        root: options.root,
        getState: function () { return getState(ctx); },
        setState: function (partial, opts) {
          Object.keys(partial).forEach(function (key) {
            if (!ctx.filterMap[key]) return;
            ctx.filterMap[key].value = partial[key];
            if (ctx.filterMap[key].config.type === 'multiselect') updateMultiselectDom(ctx.filterMap[key]);
            else updateDateRangeDom(ctx.filterMap[key]);
          });
          renderActiveBadges(ctx);
          if (!opts || !opts.silent) emitChange(ctx, null, partial);
        },
        resolvePresetRange: function (id, refDate) { return resolvePresetRange(id, refDate || ctx.referenceDate); },
        updateOptions: function (key, newOptions) {
          var fs = ctx.filterMap[key];
          if (!fs || fs.config.type !== 'multiselect') return;
          fs.config.options = newOptions;
          fs.value = fs.value.filter(function (id) { return newOptions.some(function (o) { return o.id === id; }); });
          var newColumn = createColumn(ctx, fs);
          ctx.columnsEl.replaceChild(newColumn, ctx.columnsEl.querySelector('[data-filter-key="' + key + '"]'));
          renderActiveBadges(ctx);
        },
        destroy: function () {
          document.removeEventListener('click', ctx._onDocClick);
          document.removeEventListener('keydown', ctx._onDocKeydown);
          options.root.textContent = '';
        }
      };
    });
  }

  window.FilterMenu = { init: init };
})();
