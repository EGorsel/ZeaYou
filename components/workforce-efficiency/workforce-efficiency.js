;(function () {
  'use strict';

  var STORAGE_KEY = 'zeayou-workforce-efficiency-settings';
  var WORKFORCE_DEPTS = ['housekeeping', 'receptie', 'fb', 'onderhoud'];
  var WORKFORCE_DEPT_LABELS = {
    housekeeping: 'Housekeeping',
    receptie: 'Receptie',
    fb: 'F&B',
    onderhoud: 'Onderhoud'
  };
  var WORKFORCE_DEPT_PREFIX = {
    housekeeping: 'HK',
    receptie: 'RC',
    fb: 'FB',
    onderhoud: 'OH'
  };

  var DEFAULT_THRESHOLDS = {
    housekeeping: 85,
    receptie: 65,
    fb: 70,
    onderhoud: 75
  };

  var DEFAULT_METHODS = {
    housekeeping: 'Aantal schoongemaakte kamers ÷ verwacht aantal kamers.',
    receptie: 'Aantal afgehandelde gasten ÷ verwacht aantal gasten.',
    fb: 'Aantal orders verwerkt ÷ verwacht aantal orders.',
    onderhoud: 'Aantal afgeronde werkorders ÷ geplande werkorders.'
  };

  var LOCATION_ORDER = ['Middelburg', 'Domburg', 'Zoutelande'];
  var HOTEL_LOCATIONS = {
    Middelburg: ['cityhotel-wood', 'hotel-copper-and-co'],
    Domburg: ['hotel-bommelje', 'mezger-lodges'],
    Zoutelande: ['duinhotel-tien-torens', 'strandhotel-zoutelande']
  };

  var DEPT_COLORS = {
    housekeeping: 'rgba(16,205,176,0.95)',
    receptie: 'rgba(91,126,245,0.95)',
    fb: 'rgba(245,158,11,0.95)',
    onderhoud: 'rgba(220,38,38,0.95)'
  };

  var MONTH_NAMES = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  var WEEK_LABEL = 'Week';

  var viewContainer = null;
  var matrixContainer = null;
  var thresholdContainer = null;
  var settingsContainer = null;
  var settingsState = null;
  var rowState = {
    expandedLocations: {},
    expandedHotels: {},
    expandedDepts: {}
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function hashToInt(text, max) {
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % max;
  }

  function getEmployeeIds(dept, hotel) {
    var seed = WORKFORCE_DEPT_PREFIX[dept] + '-' + hotel;
    var count = 3 + (hashToInt(seed, 2));
    var ids = [];
    for (var i = 0; i < count; i++) {
      var suffix = 102 + ((hashToInt(seed + '-' + i, 997) + i * 13) % 888);
      ids.push('DISH-' + WORKFORCE_DEPT_PREFIX[dept] + '-' + String(suffix).padStart(4, '0'));
    }
    return ids;
  }

  function getDayScore(dept, hotel, employeeId, date) {
    var base = 0;
    switch (dept) {
      case 'housekeeping': base = 84; break;
      case 'receptie': base = 66; break;
      case 'fb': base = 70; break;
      case 'onderhoud': base = 72; break;
    }
    var monthFactor = [0.96, 0.94, 0.98, 1.00, 1.05, 1.08, 1.10, 1.06, 1.00, 0.96, 0.92, 0.94][date.getMonth()];
    var weekday = date.getDay();
    var weekendPenalty = (weekday === 0 || weekday === 6) ? -3 : 0;
    var employeeBias = (hashToInt(employeeId + '-' + dept, 13) - 6) * 0.8;
    var dateNoise = ((hashToInt(date.toISOString() + employeeId, 22) / 22) - 0.45) * 6;
    return clamp(Math.round((base + employeeBias + weekendPenalty) * monthFactor + dateNoise), 42, 100);
  }

  function getThreshold(dept) {
    return settingsState.thresholds[dept] || DEFAULT_THRESHOLDS[dept];
  }

  function getHeatColor(score, threshold) {
    var ratio = clamp((score - (threshold - 20)) / 40, 0, 1);
    var green = [14, 146, 74];
    var yellow = [248, 194, 0];
    var orange = [245, 131, 35];
    var red = [156, 28, 36];
    var color = ratio < 0.4
      ? interpolateColor(red, orange, ratio / 0.4)
      : ratio < 0.75
        ? interpolateColor(orange, yellow, (ratio - 0.4) / 0.35)
        : interpolateColor(yellow, green, (ratio - 0.75) / 0.25);
    return 'rgb(' + color.join(',') + ')';
  }

  function interpolateColor(a, b, factor) {
    factor = clamp(factor, 0, 1);
    return [
      Math.round(a[0] + (b[0] - a[0]) * factor),
      Math.round(a[1] + (b[1] - a[1]) * factor),
      Math.round(a[2] + (b[2] - a[2]) * factor)
    ];
  }

  function getContrastColor(rgb) {
    var parts = rgb.match(/\d+/g).map(Number);
    var luminance = (0.299 * parts[0] + 0.587 * parts[1] + 0.114 * parts[2]) / 255;
    return luminance > 0.55 ? '#0b1120' : '#ffffff';
  }

  function formatDay(date) {
    return String(date.getDate()).padStart(2, '0') + ' ' + MONTH_NAMES[date.getMonth()];
  }

  function loadSettings() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        var parsed = JSON.parse(stored);
        settingsState = {
          thresholds: Object.assign({}, DEFAULT_THRESHOLDS, parsed.thresholds || {}),
          methods: Object.assign({}, DEFAULT_METHODS, parsed.methods || {})
        };
        return;
      }
    } catch (e) {
      console.warn('WorkforceEfficiency: kon instellingen niet laden', e);
    }
    settingsState = {
      thresholds: Object.assign({}, DEFAULT_THRESHOLDS),
      methods: Object.assign({}, DEFAULT_METHODS)
    };
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsState));
    } catch (e) {
      console.warn('WorkforceEfficiency: kon instellingen niet opslaan', e);
    }
  }

  function createDOM(tag, attrs, text) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        el.setAttribute(key, String(attrs[key]));
      });
    }
    if (text !== undefined) el.textContent = String(text);
    return el;
  }

  function buildViewShell() {
    var shell = createDOM('div', { class: 'wf-shell wf-filter-override' });
    var topGrid = createDOM('div', { class: 'wf-top-grid' });
    thresholdContainer = createDOM('div', { class: 'wf-card' });
    matrixContainer = createDOM('div', { class: 'wf-card wf-matrix-card' });
    topGrid.appendChild(thresholdContainer);
    topGrid.appendChild(matrixContainer);
    settingsContainer = createDOM('div', { class: 'wf-card' });
    shell.appendChild(topGrid);
    shell.appendChild(settingsContainer);
    return shell;
  }

  function renderHeader() {
    var header = createDOM('div', { class: 'wf-card-header' });
    var title = createDOM('div', { class: 'wf-card-title' }, 'Workforce Efficiency');
    var subtitle = createDOM('div', { class: 'wf-card-subtitle' }, 'Hiërarchische efficiëntieheatmap voor hotels, afdelingen en medewerkers over tijd.');
    var doc = createDOM('div');
    doc.appendChild(title);
    doc.appendChild(subtitle);
    header.appendChild(doc);
    return header;
  }

  function renderThresholds(selectedHotelIds) {
    thresholdContainer.innerHTML = '';
    var header = renderHeader();
    thresholdContainer.appendChild(header);
    var body = createDOM('div');
    var meta = createDOM('div', { class: 'wf-matrix-summary' }, 'Thresholds per afdeling; wijzigbaar in Instellingen. Geselecteerde hotels: ' + (selectedHotelIds.length || 'alle') + '.');
    body.appendChild(meta);
    var table = createDOM('table', { class: 'wf-threshold-table' });
    var head = createDOM('thead');
    var row = createDOM('tr');
    row.appendChild(createDOM('th', null, 'Afdeling'));
    row.appendChild(createDOM('th', null, 'Threshold'));
    head.appendChild(row);
    table.appendChild(head);
    var bodyRows = createDOM('tbody');
    WORKFORCE_DEPTS.forEach(function (dept) {
      var tr = createDOM('tr');
      tr.appendChild(createDOM('td', null, WORKFORCE_DEPT_LABELS[dept]));
      tr.appendChild(createDOM('td', null, getThreshold(dept) + '%'));
      bodyRows.appendChild(tr);
    });
    table.appendChild(bodyRows);
    body.appendChild(table);
    thresholdContainer.appendChild(body);
  }

  function buildMatrix(selectedHotelIds, selectedDepts, periodState) {
    matrixContainer.innerHTML = '';
    var header = createDOM('div', { class: 'wf-card-header' });
    var title = createDOM('div', { class: 'wf-card-title' }, 'Efficiëntie matrix');
    var subtitle = createDOM('div', { class: 'wf-card-subtitle' }, 'Klik op locaties, hotels of afdelingen om details te tonen.');
    header.appendChild(title);
    header.appendChild(subtitle);
    matrixContainer.appendChild(header);
    var summary = createDOM('div', { class: 'wf-matrix-summary' }, 'Filter: ' + (selectedHotelIds.length ? selectedHotelIds.length + ' hotels' : 'alle hotels') + ' · ' + selectedDepts.length + ' afdelingen.');
    matrixContainer.appendChild(summary);
    var wrap = createDOM('div', { class: 'wf-matrix-wrap' });
    var table = createDOM('table', { class: 'wf-matrix' });
    table.appendChild(renderMatrixHead(periodState));
    table.appendChild(renderMatrixBody(selectedHotelIds, selectedDepts, periodState));
    wrap.appendChild(table);
    matrixContainer.appendChild(wrap);
  }

  function renderMatrixHead(periodState) {
    var thead = createDOM('thead');
    var monthRow = createDOM('tr');
    var weekRow = createDOM('tr');
    var dayRow = createDOM('tr');

    monthRow.appendChild(createDOM('th', { rowspan: 3 }, 'Locatie / Hotel / Afdeling / Medewerker'));

    var months = periodState.months;
    months.forEach(function (monthState) {
      var th = createDOM('th', { colspan: monthState.colspan }, monthState.label + ' ' + monthState.year);
      monthRow.appendChild(th);
      monthState.weeks.forEach(function (weekState) {
        var weekTh = createDOM('th', { colspan: weekState.colspan }, WEEK_LABEL + ' ' + weekState.week);
        weekRow.appendChild(weekTh);
        weekState.days.forEach(function (dayState) {
          var dayTh = createDOM('th', null, dayState.label);
          dayRow.appendChild(dayTh);
        });
      });
    });
    thead.appendChild(monthRow);
    thead.appendChild(weekRow);
    thead.appendChild(dayRow);
    return thead;
  }

  function renderMatrixBody(selectedHotelIds, selectedDepts, periodState) {
    var tbody = createDOM('tbody');
    LOCATION_ORDER.forEach(function (location) {
      var hotels = HOTEL_LOCATIONS[location].filter(function (hotel) {
        return selectedHotelIds.length === 0 || selectedHotelIds.indexOf(hotel) !== -1;
      });
      if (!hotels.length) return;
      var locationRow = renderLocationRow(location, hotels, periodState);
      tbody.appendChild(locationRow);
      if (rowState.expandedLocations[location] !== false) {
        hotels.forEach(function (hotel) {
          var hotelRow = renderHotelRow(location, hotel, selectedDepts, periodState);
          tbody.appendChild(hotelRow);
        });
      }
    });
    return tbody;
  }

  function renderLocationRow(location, hotels, periodState) {
    var tr = createDOM('tr');
    tr.appendChild(createDOM('td', { colspan: 1 }, ''));
    var title = createDOM('div', { class: 'wf-row-label' });
    var expanded = rowState.expandedLocations[location] !== false;
    var toggle = createDOM('button', { type: 'button', class: 'wf-toggle-button', 'aria-expanded': String(expanded) });
    toggle.textContent = expanded ? '-' : '+';
    toggle.addEventListener('click', function () {
      rowState.expandedLocations[location] = !expanded;
      renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
    });
    title.appendChild(toggle);
    title.appendChild(createDOM('span', null, location + ' (' + hotels.length + ' hotels)'));
    tr.firstChild.appendChild(title);
    renderMatrixRowCells(tr, periodState, null, true);
    return tr;
  }

  function renderHotelRow(location, hotel, selectedDepts, periodState) {
    var tr = createDOM('tr');
    tr.appendChild(createDOM('td', null, ''));
    var title = createDOM('div', { class: 'wf-row-label' });
    var expanded = rowState.expandedHotels[hotel] !== false;
    var toggle = createDOM('button', { type: 'button', class: 'wf-toggle-button', 'aria-expanded': String(expanded) });
    toggle.textContent = expanded ? '-' : '+';
    toggle.addEventListener('click', function () {
      rowState.expandedHotels[hotel] = !expanded;
      renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
    });
    title.appendChild(toggle);
    title.appendChild(createDOM('span', null, hotelLabel(hotel)));
    tr.firstChild.appendChild(title);
    renderMatrixRowCells(tr, periodState, null, false, null, hotel);
    if (expanded) {
      selectedDepts.forEach(function (dept) {
        var deptRow = renderDeptRow(hotel, dept, periodState);
        tr.parentNode.insertBefore(deptRow, tr.nextSibling);
      });
    }
    return tr;
  }

  function renderDeptRow(hotel, dept, periodState) {
    var tr = createDOM('tr');
    tr.appendChild(createDOM('td', null, ''));
    var title = createDOM('div', { class: 'wf-row-label' });
    var expanded = rowState.expandedDepts[hotel + '|' + dept] !== false;
    var toggle = createDOM('button', { type: 'button', class: 'wf-toggle-button', 'aria-expanded': String(expanded) });
    toggle.textContent = expanded ? '-' : '+';
    toggle.addEventListener('click', function () {
      rowState.expandedDepts[hotel + '|' + dept] = !expanded;
      renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
    });
    title.appendChild(toggle);
    title.appendChild(createDOM('span', null, WORKFORCE_DEPT_LABELS[dept]));
    tr.firstChild.appendChild(title);
    renderMatrixRowCells(tr, periodState, dept, false, null, hotel);
    if (expanded) {
      var employeeIds = getEmployeeIds(dept, hotel);
      employeeIds.forEach(function (employeeId) {
        var employeeRow = renderEmployeeRow(hotel, dept, employeeId, periodState);
        tr.parentNode.insertBefore(employeeRow, tr.nextSibling);
      });
    }
    return tr;
  }

  function renderEmployeeRow(hotel, dept, employeeId, periodState) {
    var tr = createDOM('tr');
    tr.appendChild(createDOM('td', null, ''));
    var title = createDOM('div', { class: 'wf-row-label' });
    title.appendChild(createDOM('span', null, employeeId));
    title.appendChild(createDOM('span', { class: 'wf-row-subtext' }, WORKFORCE_DEPT_LABELS[dept]));
    tr.firstChild.appendChild(title);
    renderMatrixRowCells(tr, periodState, dept, false, employeeId, hotel);
    return tr;
  }

  function renderMatrixRowCells(tr, periodState, dept, isSummary, employeeId, hotel) {
    periodState.months.forEach(function (monthState) {
      monthState.weeks.forEach(function (weekState) {
        weekState.days.forEach(function (dayState) {
          var td = createDOM('td', { class: 'wf-heat-cell' });
          if (!isSummary && dept) {
            var score = getDayScore(dept, hotel || currentHotel, employeeId || 'avg', dayState.date);
            var threshold = getThreshold(dept);
            var bg = getHeatColor(score, threshold);
            var value = createDOM('div', { class: 'wf-heat-value ' + (score < threshold ? 'bad' : 'neutral') });
            value.style.backgroundColor = bg;
            value.style.color = getContrastColor(bg);
            value.textContent = score + '%';
            td.appendChild(value);
          } else {
            td.classList.add('wf-aggregate-cell');
            td.textContent = isSummary ? '' : '-';
          }
          tr.appendChild(td);
        });
      });
    });
  }

  function hotelLabel(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function buildPeriodState(periodString) {
    var start = new Date(2025, 0, 1);
    var months = [];
    for (var m = 0; m < 12; m++) {
      var date = new Date(2025, m, 1);
      var days = [];
      var last = new Date(2025, m + 1, 0).getDate();
      var week = 1;
      for (var d = 1; d <= last; d++) {
        var currentDate = new Date(2025, m, d);
        if (currentDate.getDay() === 1 && d !== 1) week += 1;
        days.push({ label: String(d).padStart(2, '0'), date: currentDate, week: week });
      }
      var weeks = [];
      var activeWeek = null;
      days.forEach(function (day) {
        var current = weeks[weeks.length - 1];
        if (!current || current.week !== day.week) {
          current = { week: day.week, days: [], colspan: 0 };
          weeks.push(current);
        }
        current.days.push(day);
        current.colspan += 1;
      });
      months.push({ label: MONTH_NAMES[m], year: 2025, weeks: weeks, colspan: days.length });
    }
    return { months: months };
  }

  var currentFilter = { hotels: [], depts: WORKFORCE_DEPTS.slice(), period: 'this-year' };
  var currentHotel = null;

  function render(containerId, selectedHotelIds, hotelMeta, options) {
    if (!containerId || !hotelMeta) return;
    var container = document.getElementById(containerId);
    if (!container) return;

    viewContainer = container;
    matrixContainer = null;
    thresholdContainer = null;
    settingsContainer = null;

    currentFilter.hotels = Array.isArray(selectedHotelIds) ? selectedHotelIds.slice() : [];
    currentFilter.depts = options && Array.isArray(options.depts) ? options.depts.slice() : WORKFORCE_DEPTS.slice();
    currentFilter.period = (options && options.period) || 'this-year';
    currentFilter.selectedHotelMeta = hotelMeta;
    currentHotel = currentFilter.hotels.length ? currentFilter.hotels[0] : Object.keys(hotelMeta)[0];

    loadSettings();
    var shell = buildViewShell();
    container.innerHTML = '';
    container.appendChild(shell);
    renderThresholds(currentFilter.hotels);
    renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
    renderSettings();
  }

  function renderMatrix(hotels, depts, periodState) {
    if (!matrixContainer) return;
    matrixContainer.innerHTML = '';
    matrixContainer.appendChild(renderHeader());
    var summary = createDOM('div', { class: 'wf-matrix-summary' }, 'Filter: ' + (hotels.length ? hotels.length + ' hotels' : 'alle hotels') + ' · ' + depts.length + ' afdelingen');
    matrixContainer.appendChild(summary);
    var wrap = createDOM('div', { class: 'wf-matrix-wrap' });
    var table = createDOM('table', { class: 'wf-matrix' });
    table.appendChild(renderMatrixHead(periodState));
    table.appendChild(renderMatrixBody(hotels, depts, periodState));
    wrap.appendChild(table);
    matrixContainer.appendChild(wrap);
  }

  function renderSettings() {
    if (!settingsContainer) return;
    settingsContainer.innerHTML = '';
    var header = createDOM('div', { class: 'wf-card-header' });
    var title = createDOM('div', { class: 'wf-card-title' }, 'Instellingen');
    var subtitle = createDOM('div', { class: 'wf-card-subtitle' }, 'Berekeningsmethodes en thresholds per afdeling.');
    header.appendChild(title);
    header.appendChild(subtitle);
    settingsContainer.appendChild(header);
    var list = createDOM('div', { class: 'wf-settings-list' });
    WORKFORCE_DEPTS.forEach(function (dept) {
      var row = createDOM('div', { class: 'wf-settings-row' });
      var label = createDOM('label', { for: 'wf-th-' + dept });
      label.innerHTML = '<strong>' + WORKFORCE_DEPT_LABELS[dept] + '</strong><small>' + DEFAULT_METHODS[dept] + '</small>';
      var input = createDOM('input', { class: 'wf-settings-input', type: 'number', id: 'wf-th-' + dept, min: '0', max: '100', value: getThreshold(dept) });
      input.addEventListener('change', function () {
        settingsState.thresholds[dept] = clamp(Number(this.value) || DEFAULT_THRESHOLDS[dept], 0, 100);
        saveSettings();
        renderThresholds(currentFilter.hotels);
        renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
      });
      row.appendChild(label);
      row.appendChild(input);
      list.appendChild(row);
    });
    settingsContainer.appendChild(list);
    var toolbar = createDOM('div', { class: 'wf-settings-toolbar' });
    var resetBtn = createDOM('button', { type: 'button', class: 'wf-settings-button secondary' }, 'Reset standaard');
    resetBtn.addEventListener('click', function () {
      settingsState.thresholds = Object.assign({}, DEFAULT_THRESHOLDS);
      saveSettings();
      renderSettings();
      renderThresholds(currentFilter.hotels);
      renderMatrix(currentFilter.hotels, currentFilter.depts, buildPeriodState(currentFilter.period));
    });
    toolbar.appendChild(resetBtn);
    settingsContainer.appendChild(toolbar);
  }

  window.WorkforceEfficiency = { render: render };
})();
