const CHART_COLORS = ['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)'];
const CHART_OTHER_COLOR = 'var(--series-other)';

function currentWeekDailyBuckets(entries){
  const now = new Date();
  const today = new Date(now);
  today.setHours(0,0,0,0);
  const wkStart = startOfWeek(now);

  const buckets = [];
  for(let i=0;i<7;i++){
    const ds = new Date(wkStart);
    ds.setDate(ds.getDate() + i);
    const de = new Date(ds);
    de.setDate(de.getDate() + 1);
    const total = entries.filter(e => {
      const d = new Date(e.date);
      return d >= ds && d < de;
    }).reduce((s,e)=>s+e.amount,0);
    buckets.push({ label: ds.toLocaleDateString('en-IN', {weekday:'short'}), value: total, future: ds > today });
  }
  return buckets;
}

function currentMonthWeeklyBuckets(entries){
  const now = new Date();
  const start = startOfMonth(now);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  const buckets = [];
  let cursor = new Date(start);
  while(cursor < end){
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + 7);
    const clippedEnd = bucketEnd < end ? bucketEnd : end;

    const total = entries.filter(e => {
      const d = new Date(e.date);
      return d >= cursor && d < clippedEnd;
    }).reduce((s,e)=>s+e.amount,0);

    const rangeEnd = new Date(clippedEnd);
    rangeEnd.setDate(rangeEnd.getDate() - 1);
    const label = cursor.getDate() + '–' + rangeEnd.getDate() + ' ' + cursor.toLocaleDateString('en-IN', {month:'short'});
    buckets.push({ label, value: total, future: cursor > now });
    cursor = clippedEnd;
  }
  return buckets;
}

function last6MonthsBuckets(entries){
  const now = new Date();
  const buckets = [];
  for(let i=5;i>=0;i--){
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = entries.filter(e => {
      const d = new Date(e.date);
      return d >= ms && d < me;
    }).reduce((s,e)=>s+e.amount,0);
    buckets.push({ label: ms.toLocaleDateString('en-IN', {month:'short'}), value: total });
  }
  return buckets;
}

function currentMonthCategoryTotals(entries){
  const start = startOfMonth(new Date());
  const totals = {};
  entries.filter(e => new Date(e.date) >= start).forEach(e => {
    const c = e.category || 'Other';
    totals[c] = (totals[c] || 0) + e.amount;
  });
  return Object.entries(totals).map(([label, value]) => ({ label, value }));
}

function currentMonthPersonTotals(entries){
  const start = startOfMonth(new Date());
  const totals = {};
  entries.filter(e => new Date(e.date) >= start).forEach(e => {
    const p = e.who || 'Other';
    totals[p] = (totals[p] || 0) + e.amount;
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

function polarToCartesian(cx, cy, radius, angleDeg){
  const rad = angleDeg * Math.PI / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function donutSlicePath(cx, cy, outerR, innerR, startAngle, endAngle){
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  return `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
}

/* Donut chart + legend — for category / payment-type share-of-whole breakdowns */
function renderDonutChart(containerId, items){
  const container = document.getElementById(containerId);
  let data = items.filter(d => d.value > 0).sort((a,b) => b.value - a.value);

  if(data.length === 0){
    container.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }

  const maxSlices = 7;
  if(data.length > maxSlices){
    const head = data.slice(0, maxSlices - 1);
    const tailTotal = data.slice(maxSlices - 1).reduce((s,d) => s + d.value, 0);
    data = head.concat([{ label: 'Other', value: tailTotal }]);
  }

  const total = data.reduce((s,d) => s + d.value, 0);
  const cx = 60, cy = 60, outerR = 55, innerR = 32;
  let angle = -90;

  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const startAngle = angle;
    const endAngle = angle + pct * 360;
    angle = endAngle;
    const color = d.label === 'Other' ? CHART_OTHER_COLOR : CHART_COLORS[i % CHART_COLORS.length];
    return { ...d, pct, startAngle, endAngle, color };
  });

  const svgSlices = slices.map(s => {
    if(s.pct >= 0.999){
      return `<circle cx="${cx}" cy="${cy}" r="${(outerR+innerR)/2}" fill="none" stroke="${s.color}" stroke-width="${outerR-innerR}" class="donut-slice" data-label="${s.label}" data-value="${s.value}"></circle>`;
    }
    return `<path d="${donutSlicePath(cx, cy, outerR, innerR, s.startAngle, s.endAngle)}" fill="${s.color}" class="donut-slice" data-label="${s.label}" data-value="${s.value}"></path>`;
  }).join('');

  const legendRows = slices.map(s => `
    <div class="cbar-row">
      <span class="cbar-dot" style="background:${s.color}"></span>
      <div class="cbar-body">
        <div class="cbar-top">
          <span class="cbar-label">${s.label}</span>
          <span class="cbar-val">${fmt(s.value)} · ${Math.round(s.pct * 100)}%</span>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-wrap">
      <svg class="donut-svg" viewBox="0 0 120 120">${svgSlices}</svg>
      <div class="donut-legend">${legendRows}</div>
    </div>
  `;

  container.querySelectorAll('.donut-slice').forEach(el => {
    el.addEventListener('pointermove', (e) => {
      showChartTooltip(e.clientX, e.clientY, fmt(Number(el.dataset.value)), el.dataset.label);
    });
    el.addEventListener('pointerleave', hideChartTooltip);
  });
}

/* Bar + trend-line combo chart — for weekly/monthly period breakdowns.
   Buckets flagged {future:true} render as flat grey placeholders with no
   line/area/label/tooltip, since there's no data for a day that hasn't happened. */
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
    return { x, y, label: b.label, value: b.value, future: !!b.future };
  });

  const bars = points.map(p => {
    const barH = Math.max(2, (p.value / max) * plotH);
    const barY = padTop + plotH - barH;
    const fill = p.future ? 'var(--line)' : colorVar;
    const cls = p.future ? 'trend-bar trend-future' : 'trend-bar';
    return `<rect class="${cls}" x="${(p.x - barW/2).toFixed(1)}" y="${barY.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="5" fill="${fill}" data-label="${p.label}" data-value="${p.value}"></rect>`;
  }).join('');

  const activePoints = points.filter(p => !p.future);
  const linePath = activePoints.map((p,i) => (i===0?'M':'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
  const areaPath = activePoints.length > 0
    ? `${linePath} L ${activePoints[activePoints.length-1].x.toFixed(1)} ${(padTop+plotH).toFixed(1)} L ${activePoints[0].x.toFixed(1)} ${(padTop+plotH).toFixed(1)} Z`
    : '';

  const dots = activePoints.map(p => `
    <circle class="trend-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${colorVar}" data-label="${p.label}" data-value="${p.value}"></circle>
  `).join('');

  const valueLabels = activePoints.map(p => `
    <text x="${p.x.toFixed(1)}" y="${Math.max(12, p.y - 10).toFixed(1)}" text-anchor="middle" class="trend-value-label">${fmt(p.value)}</text>
  `).join('');

  const xLabels = points.map(p => `
    <text x="${p.x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="${p.future ? 'trend-x-label trend-future-label' : 'trend-x-label'}">${p.label}</text>
  `).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" class="trend-svg" preserveAspectRatio="xMidYMid meet">
      <line x1="${padX}" y1="${(padTop+plotH).toFixed(1)}" x2="${w-padX}" y2="${(padTop+plotH).toFixed(1)}" class="trend-baseline"></line>
      ${areaPath ? `<path d="${areaPath}" class="trend-area" fill="${colorVar}"></path>` : ''}
      ${bars}
      ${linePath ? `<path d="${linePath}" fill="none" class="trend-line" stroke="${colorVar}"></path>` : ''}
      ${dots}
      ${valueLabels}
      ${xLabels}
    </svg>
  `;

  container.querySelectorAll('.trend-bar:not(.trend-future), .trend-dot').forEach(el => {
    el.addEventListener('pointermove', (e) => {
      showChartTooltip(e.clientX, e.clientY, fmt(Number(el.dataset.value)), el.dataset.label);
    });
    el.addEventListener('pointerleave', hideChartTooltip);
  });
}
