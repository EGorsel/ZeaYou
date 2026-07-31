// ZeaYou mockup — "Cost of Workforce" grafiek (gestapeld staafdiagram + budgetlijn)
// Geïsoleerd van index.html; publieke API: window.CostOfWorkforce.render(canvasId, selectedHotelIds, hotelMeta)
// Verwacht: Chart.js (global `Chart`) al geladen, en dat de canvas binnen een element met
// class "chart-canvas-wrap" staat (voor de custom tooltip-positionering).

(function () {
  'use strict';

  var DEPTS = ['housekeeping', 'receptie', 'fb', 'onderhoud'];
  var DEPT_LABELS = { housekeeping: 'Housekeeping', receptie: 'Receptie', fb: 'F&B', onderhoud: 'Onderhoud' };
  var DEPT_COLORS = { housekeeping: '#10cdb0', receptie: '#8b5cf6', fb: '#f59e0b', onderhoud: '#c9699a' };
  var BUDGET_COLOR = '#5b7ef5';
  var GRID_COLOR = 'rgba(216,221,232,0.55)';
  var TEXT_COLOR = '#6b7a90';

  var MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  var DEPT_SHARE = { housekeeping: 0.36, receptie: 0.24, fb: 0.28, onderhoud: 0.12 }; // som = 1
  var SEASONALITY   = [0.90, 0.86, 0.92, 0.96, 1.00, 1.14, 1.22, 1.20, 1.04, 0.94, 0.88, 0.94]; // gem. = 1.00, zomerpiek
  var BUDGET_FACTOR = [0.95, 0.97, 0.99, 1.02, 1.03, 1.05, 1.00, 0.96, 0.98, 1.03, 1.02, 1.00]; // gem. = 1.00, andere curve -> over/onder budget varieert per maand
  var COST_PER_ROOM = 858; // €/kamer/maand

  var chartInstance = null;

  function buildHotelData(hotelMeta) {
    var data = {};
    Object.keys(hotelMeta).forEach(function (slug) {
      var rooms = hotelMeta[slug].rooms || 0;
      data[slug] = {};
      DEPTS.forEach(function (dept) {
        data[slug][dept] = MONTHS.map(function (_, m) {
          return rooms * COST_PER_ROOM * DEPT_SHARE[dept] * SEASONALITY[m];
        });
      });
    });
    return data;
  }

  function fmtCompactEuro(v) {
    return Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : Math.round(v / 1000) + 'K';
  }

  var labelsPlugin = {
    id: 'workforceLabels',
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      ctx.save();
      ctx.textAlign = 'center';
      chart.data.labels.forEach(function (_, m) {
        var stackTopY = null, stackX = null, total = 0;
        for (var d = 0; d < DEPTS.length; d++) {
          var meta = chart.getDatasetMeta(d);
          var el = meta.data[m];
          if (!el) continue;
          var p = el.getProps(['x', 'y', 'base'], true);
          var segHeight = Math.abs(p.base - p.y);
          var val = chart.data.datasets[d].data[m];
          total += val;
          if (segHeight > 16) {
            ctx.font = '600 10px Inter, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(fmtCompactEuro(val), p.x, (p.y + p.base) / 2 + 3);
          }
          if (stackTopY === null || p.y < stackTopY) { stackTopY = p.y; stackX = p.x; }
        }
        if (stackX !== null) {
          ctx.font = '700 10px Inter, sans-serif';
          ctx.fillStyle = TEXT_COLOR;
          ctx.fillText(fmtCompactEuro(total), stackX, stackTopY - 8);
        }
      });
      ctx.restore();
    }
  };

  function tooltipHandler(context, deptTotals, hotelIds, hotelMeta, wfData) {
    var tt = context.tooltip;
    var wrap = context.chart.canvas.closest('.chart-canvas-wrap');
    var tooltipEl = document.getElementById('workforce-tooltip');
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'workforce-tooltip';
      tooltipEl.className = 'workforce-tooltip';
      wrap.appendChild(tooltipEl);
    }
    if (tt.opacity === 0) { tooltipEl.style.opacity = 0; return; }

    var dp = tt.dataPoints[0];
    var m = dp.dataIndex;
    var html;
    if (dp.dataset._dept) {
      var dept = dp.dataset._dept;
      var total = deptTotals[dept][m];
      var rows = hotelIds.map(function (h) {
        return { name: (hotelMeta[h] && hotelMeta[h].label) || h, val: (wfData[h] && wfData[h][dept][m]) || 0 };
      }).sort(function (a, b) { return b.val - a.val; });
      html = '<div class="wf-tip-title">' + DEPT_LABELS[dept] + ' — ' + MONTHS[m] + '</div>'
        + '<div class="wf-tip-total">Totaal: € ' + Math.round(total).toLocaleString('nl-NL') + '</div>'
        + rows.map(function (r) { return '<div class="wf-tip-row"><span>' + r.name + '</span><span>€ ' + Math.round(r.val).toLocaleString('nl-NL') + '</span></div>'; }).join('');
    } else {
      html = '<div class="wf-tip-title">' + MONTHS[m] + '</div>'
        + '<div class="wf-tip-total">Begrote personeelskosten: € ' + Math.round(dp.raw).toLocaleString('nl-NL') + '</div>';
    }
    tooltipEl.innerHTML = html;

    var left = context.chart.canvas.offsetLeft + tt.caretX;
    var top = context.chart.canvas.offsetTop + tt.caretY;
    tooltipEl.style.opacity = 1;
    tooltipEl.style.transform = '';
    if (left + tooltipEl.offsetWidth > context.chart.width) { tooltipEl.style.transform = 'translateX(-100%)'; left -= 8; }
    if (top + tooltipEl.offsetHeight > context.chart.height + 40) top = context.chart.height - tooltipEl.offsetHeight;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function render(canvasId, selectedHotelIds, hotelMeta) {
    var el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined' || !hotelMeta) return;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    var wfData = buildHotelData(hotelMeta);
    var hotels = selectedHotelIds || Object.keys(hotelMeta); // expliciet lege array (0 hotels) blijft leeg -> nul-totalen

    var deptTotals = {};
    DEPTS.forEach(function (dept) {
      deptTotals[dept] = MONTHS.map(function (_, m) {
        return hotels.reduce(function (sum, h) { return sum + ((wfData[h] && wfData[h][dept][m]) || 0); }, 0);
      });
    });
    var monthlyActual = MONTHS.map(function (_, m) {
      return DEPTS.reduce(function (s, dept) { return s + deptTotals[dept][m]; }, 0);
    });
    var avgActual = monthlyActual.reduce(function (a, b) { return a + b; }, 0) / monthlyActual.length;
    var budgetData = BUDGET_FACTOR.map(function (f) { return avgActual * f; });

    var datasets = DEPTS.map(function (dept) {
      return {
        label: DEPT_LABELS[dept], data: deptTotals[dept], backgroundColor: DEPT_COLORS[dept],
        stack: 'workforce', borderRadius: 0, barPercentage: 0.62, _dept: dept
      };
    });
    datasets.push({
      label: 'Begrote personeelskosten', data: budgetData, type: 'line',
      borderColor: BUDGET_COLOR, backgroundColor: BUDGET_COLOR, borderWidth: 2.25,
      pointRadius: 3.5, pointBackgroundColor: BUDGET_COLOR, fill: false, tension: 0.15
    });

    chartInstance = new Chart(el, {
      type: 'bar',
      data: { labels: MONTHS, datasets: datasets },
      plugins: [labelsPlugin],
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        layout: { padding: { top: 22 } },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false, external: function (context) { tooltipHandler(context, deptTotals, hotels, hotelMeta, wfData); } }
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, color: TEXT_COLOR } },
          y: {
            stacked: true, grid: { color: GRID_COLOR },
            ticks: { font: { size: 10 }, color: TEXT_COLOR, callback: function (v) { return '€' + (v / 1000).toFixed(0) + 'k'; } }
          }
        }
      }
    });
  }

  window.CostOfWorkforce = { render: render };
})();
