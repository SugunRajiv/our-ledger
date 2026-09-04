const DONUT_COLORS = ['var(--series-1)','var(--series-2)','var(--series-3)','var(--series-4)','var(--series-5)','var(--series-6)','var(--series-7)'];
const DONUT_OTHER_COLOR = 'var(--series-other)';

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

function renderDonut(containerId, items, centerLabel){
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
  const r = 40, cx = 50, cy = 50, strokeW = 16;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((d, i) => {
    const frac = d.value / total;
    const len = frac * circumference;
    const color = d.label === 'Other' ? DONUT_OTHER_COLOR : DONUT_COLORS[i % DONUT_COLORS.length];
    const slice = {
      label: d.label, value: d.value, color,
      dasharray: `${len} ${circumference - len}`,
      dashoffset: -offset,
    };
    offset += len;
    return slice;
  });

  const svgSlices = slices.map(s => `
    <circle class="donut-slice" cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${s.color}" stroke-width="${strokeW}"
      stroke-dasharray="${s.dasharray}" stroke-dashoffset="${s.dashoffset}"
      data-label="${s.label}" data-value="${s.value}">
      <title>${s.label}: ${fmt(s.value)}</title>
    </circle>
  `).join('');

  const legendRows = slices.map(s => `
    <div class="donut-legend-row">
      <span class="swatch" style="background:${s.color}"></span>
      <span class="lbl">${s.label}</span>
      <span class="val">${fmt(s.value)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="donut-wrap">
      <div class="donut-svg-box">
        <svg viewBox="0 0 100 100">
          <g transform="rotate(-90 ${cx} ${cy})">${svgSlices}</g>
        </svg>
        <div class="donut-center">
          <div class="amt">${fmt(total)}</div>
          <div class="lbl">${centerLabel || 'Total'}</div>
        </div>
      </div>
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
