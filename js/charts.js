const CHART_COLORS = ['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)'];
const CHART_OTHER_COLOR = 'var(--series-other)';

function last30DayWeeklyBuckets(entries){
  const start = new Date();
  start.setDate(start.getDate() - 27);
  start.setHours(0,0,0,0);

  const buckets = [];
  for(let i=0;i<4;i++){
    const ws = new Date(start);
    ws.setDate(ws.getDate() + i*7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const total = entries.filter(e => {
      const d = new Date(e.date);
      return d >= ws && d < we;
    }).reduce((s,e)=>s+e.amount,0);
    const weEnd = new Date(we);
    weEnd.setDate(weEnd.getDate() - 1);
    const label = ws.toLocaleDateString('en-IN', {day:'numeric', month:'short'}) + '–' + weEnd.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
    buckets.push({ label, value: total });
  }
  return buckets;
}

function lastMonthCategoryTotals(entries){
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0,0,0,0);

  const totals = {};
  entries.filter(e => new Date(e.date) >= start).forEach(e => {
    const c = e.category || 'Other';
    totals[c] = (totals[c] || 0) + e.amount;
  });
  return Object.entries(totals).map(([label, value]) => ({ label, value }));
}

function ensureChartTooltip(){
  let tt = document.getElementById('chart-tooltip');
  if(!tt){
    tt = document.createElement('div');
    tt.id = 'chart-tooltip';
    tt.className = 'chart-tooltip';
    document.body.appendChild(tt);
  }
  return tt;
}

function showChartTooltip(x, y, valueText, labelText){
  const tt = ensureChartTooltip();
  tt.innerHTML = '';
  const val = document.createElement('span');
  val.className = 'tt-val';
  val.textContent = valueText;
  const lbl = document.createElement('span');
  lbl.className = 'tt-lbl';
  lbl.textContent = labelText;
  tt.appendChild(val);
  tt.appendChild(lbl);
  tt.style.left = (x + 14) + 'px';
  tt.style.top = (y + 14) + 'px';
  tt.style.display = 'block';
}

function hideChartTooltip(){
  const tt = document.getElementById('chart-tooltip');
  if(tt) tt.style.display = 'none';
}

/* Colorful ranked horizontal bars — for category / payment-type breakdowns */
function renderColorBars(containerId, items){
  const container = document.getElementById(containerId);
  let data = items.filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  if(data.length === 0){
    container.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }

  const maxBars = 7;
  if(data.length > maxBars){
    const head = data.slice(0, maxBars - 1);
    const tailTotal = data.slice(maxBars - 1).reduce((s,d) => s + d.value, 0);
    data = head.concat([{ label: 'Other', value: tailTotal }]);
  }

  const max = data[0].value;
  container.innerHTML = data.map((d, i) => {
    const color = d.label === 'Other' ? CHART_OTHER_COLOR : CHART_COLORS[i % CHART_COLORS.length];
    const pct = Math.max(4, Math.round(d.value / max * 100));
    return `
      <div class="cbar-row">
        <span class="cbar-dot" style="background:${color}"></span>
        <div class="cbar-body">
          <div class="cbar-top">
            <span class="cbar-label">${d.label}</span>
            <span class="cbar-val">${fmt(d.value)}</span>
          </div>
          <div class="cbar-track"><div class="cbar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
      </div>
    `;
  }).join('');
}

/* Bar + trend-line combo chart — for weekly/period breakdowns */
function renderTrendChart(containerId, buckets, colorVar){
  const container = document.getElementById(containerId);
  const max = Math.max(...buckets.map(b => b.value), 1);

  const w = 320, h = 170, padTop = 30, padBottom = 28, padX = 24;
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const n = buckets.length;
  const stepX = plotW / n;
  const barW = Math.min(46, stepX * 0.5);

  const points = buckets.map((b, i) => {
    const x = padX + stepX * i + stepX / 2;
    const y = padTop + plotH - (b.value / max) * plotH;
    return { x, y, label: b.label, value: b.value };
  });

  const bars = points.map(p => {
    const barH = Math.max(2, (p.value / max) * plotH);
    const barY = padTop + plotH - barH;
    return `<rect class="trend-bar" x="${(p.x - barW/2).toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="${colorVar}" data-label="${p.label}" data-value="${p.value}"></rect>`;
  }).join('');

  const linePath = points.map((p,i) => (i===0?'M':'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const areaPath = `${linePath} L ${points[points.length-1].x.toFixed(1)} ${(padTop+plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop+plotH).toFixed(1)} Z`;

  const dots = points.map(p => `
    <circle class="trend-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${colorVar}" data-label="${p.label}" data-value="${p.value}"></circle>
  `).join('');

  const valueLabels = points.map(p => `
    <text x="${p.x.toFixed(1)}" y="${Math.max(12, p.y - 10).toFixed(1)}" text-anchor="middle" class="trend-value-label">${fmt(p.value)}</text>
  `).join('');

  const xLabels = points.map(p => `
    <text x="${p.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="trend-x-label">${p.label}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
      <line x1="${padX}" y1="${(padTop+plotH).toFixed(1)}" x2="${w-padX}" y2="${(padTop+plotH).toFixed(1)}" class="trend-baseline"></line>
      <path d="${areaPath}" class="trend-area" fill="${colorVar}"></path>
      ${bars}
      <path d="${linePath}" fill="none" class="trend-line" stroke="${colorVar}"></path>
      ${dots}
      ${valueLabels}
      ${xLabels}
    </svg>
  `;

  container.querySelectorAll('.trend-bar, .trend-dot').forEach(el => {
    el.addEventListener('pointermove', (e) => {
      showChartTooltip(e.clientX, e.clientY, fmt(Number(el.dataset.value)), el.dataset.label);
    });
    el.addEventListener('pointerleave', hideChartTooltip);
  });
}
