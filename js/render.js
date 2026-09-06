const PAGE_SIZE = 10;

function paginate(items, page){
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const clamped = Math.min(Math.max(1, page), totalPages);
  const start = (clamped - 1) * PAGE_SIZE;
  return { pageItems: items.slice(start, start + PAGE_SIZE), page: clamped, totalPages };
}

function renderPager(containerId, page, totalPages, totalItems, onChange){
  const el = document.getElementById(containerId);
  if(totalItems === 0){
    el.innerHTML = '';
    return;
  }

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);
  const options = Array.from({length: totalPages}, (_, i) => i + 1)
    .map(p => `<option value="${p}"${p === page ? ' selected' : ''}>Page ${p} of ${totalPages}</option>`)
    .join('');

  el.innerHTML = `
    <div class="pager-info">Showing ${start}–${end} of ${totalItems}</div>
    <div class="pager-controls">
      <button type="button" class="pager-btn" data-dir="prev" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
      <select class="pager-select" ${totalPages <= 1 ? 'disabled' : ''}>${options}</select>
      <button type="button" class="pager-btn" data-dir="next" ${page >= totalPages ? 'disabled' : ''} aria-label="Next page">›</button>
    </div>
  `;

  el.querySelector('.pager-select').addEventListener('change', (e) => onChange(Number(e.target.value)));
  el.querySelector('[data-dir="prev"]').addEventListener('click', () => { if(page > 1) onChange(page - 1); });
  el.querySelector('[data-dir="next"]').addEventListener('click', () => { if(page < totalPages) onChange(page + 1); });
}

function render(){
  const now = new Date();
  const wkStart = startOfWeek(now);
  const moStart = startOfMonth(now);
  const yrStart = startOfYear(now);

  const weekEntries = expenses.filter(e => new Date(e.date) >= wkStart);
  const monthEntries = expenses.filter(e => new Date(e.date) >= moStart);
  const yearEntries = expenses.filter(e => new Date(e.date) >= yrStart);

  const weekTotal = weekEntries.reduce((s,e)=>s+e.amount,0);
  const monthTotal = monthEntries.reduce((s,e)=>s+e.amount,0);
  const yearTotal = yearEntries.reduce((s,e)=>s+e.amount,0);
  const overallTotal = expenses.reduce((s,e)=>s+e.amount,0);

  document.getElementById('week-total').textContent = fmt(weekTotal);
  document.getElementById('month-total').textContent = fmt(monthTotal);
  document.getElementById('year-total').textContent = fmt(yearTotal);
  document.getElementById('expense-overall-total').textContent = fmt(overallTotal);

  const overallLabelEl = document.getElementById('expense-overall-label');
  if(expenses.length > 0){
    const earliestDate = expenses.reduce((min, e) => {
      const d = new Date(e.date);
      return d < min ? d : min;
    }, new Date(expenses[0].date));
    overallLabelEl.textContent = `Total (from ${earliestDate.toLocaleDateString('en-IN', {month:'long'})})`;
  } else {
    overallLabelEl.textContent = 'Total';
  }

  const budgetBar = document.getElementById('budget-bar');
  if(monthlyBudget > 0){
    document.getElementById('budget-total').textContent = fmt(monthTotal) + ' of ' + fmt(monthlyBudget);
    const pct = Math.min(100, Math.round(monthTotal / monthlyBudget * 100));
    budgetBar.style.width = pct + '%';
    budgetBar.style.background = pct >= 100 ? 'var(--danger)' : (pct >= 80 ? 'var(--ochre)' : 'var(--teal)');
  } else {
    document.getElementById('budget-total').textContent = 'Not set';
    budgetBar.style.width = '0%';
  }

  const banner = document.getElementById('banner');
  if(expenses.length === 0){
    banner.className = 'banner';
    banner.textContent = 'No expenses logged yet. Add the first one below.';
  } else {
    const lastDate = new Date(expenses[0].date);
    const daysAgo = Math.floor((now - lastDate) / 86400000);
    if(weekEntries.length === 0){
      banner.className = 'banner';
      banner.textContent = 'Nothing entered this week yet' + (daysAgo>0? (' — last entry ' + daysAgo + ' day' + (daysAgo>1?'s':'') + ' ago.') : '.');
    } else {
      banner.className = 'banner ok';
      banner.textContent = weekEntries.length + ' entr' + (weekEntries.length>1?'ies':'y') + ' logged this week. Nice.';
    }
  }

  const saveTotal = savings.reduce((s,e)=>s+e.amount,0);
  const saveWeekTotal = savings.filter(e => new Date(e.date) >= wkStart).reduce((s,e)=>s+e.amount,0);
  const saveMonthTotal = savings.filter(e => new Date(e.date) >= moStart).reduce((s,e)=>s+e.amount,0);
  const saveYearTotal = savings.filter(e => new Date(e.date) >= yrStart).reduce((s,e)=>s+e.amount,0);
  document.getElementById('save-total').textContent = fmt(saveTotal);
  document.getElementById('save-year-total').textContent = fmt(saveYearTotal);
  document.getElementById('top-save-month-total').textContent = fmt(saveMonthTotal);
  document.getElementById('top-save-week-total').textContent = fmt(saveWeekTotal);

  const saveTotalLabelEl = document.getElementById('save-total-label');
  if(savings.length > 0){
    const earliestSaveDate = savings.reduce((min, e) => {
      const d = new Date(e.date);
      return d < min ? d : min;
    }, new Date(savings[0].date));
    saveTotalLabelEl.textContent = `Total (from ${earliestSaveDate.toLocaleDateString('en-IN', {month:'long'})})`;
  } else {
    saveTotalLabelEl.textContent = 'Total';
  }

  renderTrendChart('savings-week-trend', currentWeekDailyBuckets(savings), 'var(--teal)');
  renderTrendChart('savings-weekly-donut', currentMonthWeeklyBuckets(savings), 'var(--teal)');
  renderTrendChart('savings-6month-trend', last6MonthsBuckets(savings), 'var(--teal)');
  renderDonutChart('save-cat-breakdown', currentMonthCategoryTotals(savings));
  renderDonutChart('save-person-month-breakdown', currentMonthPersonTotals(savings));

  const savePayTotals = {};
  savings.forEach(e => { const t = e.type || 'Other'; savePayTotals[t] = (savePayTotals[t]||0) + e.amount; });
  renderDonutChart('save-pay-breakdown', Object.entries(savePayTotals).map(([label, value]) => ({ label, value })));

  const people = Array.from(new Set([
    ...Object.values(householdMembers).map(m => m.displayName),
    ...expenses.map(e => e.who),
    ...savings.map(e => e.who)
  ])).filter(Boolean);
  const personTotals = people.map(p => ({
    name: p,
    spent: expenses.filter(e=>e.who===p).reduce((s,e)=>s+e.amount,0),
    saved: savings.filter(e=>e.who===p).reduce((s,e)=>s+e.amount,0)
  }));
  const personMax = Math.max(1, ...personTotals.flatMap(p => [p.spent, p.saved]));

  const personBox = document.getElementById('person-breakdown');
  personBox.innerHTML = `<div class="person-grid">${personTotals.map(p => `
    <div class="person-card">
      <div class="pname">${p.name}</div>
      <div class="cbar-row">
        <span class="cbar-dot" style="background:var(--ochre)"></span>
        <div class="cbar-body">
          <div class="cbar-top"><span class="cbar-label">Spent</span><span class="cbar-val">${fmt(p.spent)}</span></div>
          <div class="cbar-track"><div class="cbar-fill" style="width:${Math.round(p.spent / personMax * 100)}%;background:var(--ochre)"></div></div>
        </div>
      </div>
      <div class="cbar-row">
        <span class="cbar-dot" style="background:var(--teal)"></span>
        <div class="cbar-body">
          <div class="cbar-top"><span class="cbar-label">Saved</span><span class="cbar-val">${fmt(p.saved)}</span></div>
          <div class="cbar-track"><div class="cbar-fill" style="width:${Math.round(p.saved / personMax * 100)}%;background:var(--teal)"></div></div>
        </div>
      </div>
    </div>
  `).join('')}</div>`;

  renderTrendChart('expense-week-trend', currentWeekDailyBuckets(expenses), 'var(--ochre)');
  renderDonutChart('cat-breakdown', currentMonthCategoryTotals(expenses));
  renderDonutChart('person-month-breakdown', currentMonthPersonTotals(expenses));
  renderTrendChart('expense-weekly-donut', currentMonthWeeklyBuckets(expenses), 'var(--ochre)');
  renderTrendChart('expense-6month-trend', last6MonthsBuckets(expenses), 'var(--ochre)');

  const payTotals = {};
  expenses.forEach(e => { const t = e.type || 'Other'; payTotals[t] = (payTotals[t]||0) + e.amount; });
  renderDonutChart('pay-breakdown', Object.entries(payTotals).map(([label, value]) => ({ label, value })));

  renderEntriesList();
  renderTable();
}

function renderEntriesList(){
  const { pageItems, page, totalPages } = paginate(expenses, entriesListPage);
  entriesListPage = page;

  const list = document.getElementById('entries-list');
  if(expenses.length === 0){
    list.innerHTML = '<div class="empty">Nothing logged yet. Add your first expense above.</div>';
  } else {
    list.innerHTML = pageItems.map(e => `
      <div class="entry">
        <div>
          <div>${e.category}${e.note ? ' — ' + e.note : ''}</div>
          <div class="meta">${new Date(e.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} · ${e.who}${e.type ? ' · ' + e.type : ''}</div>
        </div>
        <div class="amt">${fmt(e.amount)}</div>
      </div>
    `).join('');
  }

  renderPager('entries-list-pager', entriesListPage, totalPages, expenses.length, (p) => {
    entriesListPage = p;
    renderEntriesList();
  });
}

function buildAllEntries(){
  const exp = expenses.map(e => ({
    id: e.id, date: e.date, kind: 'expense', category: e.category,
    amount: e.amount, who: e.who, detail: (e.type || '') + (e.note ? ' — ' + e.note : '')
  }));
  const sav = savings.map(e => ({
    id: e.id, date: e.date, kind: 'savings', category: e.category,
    amount: e.amount, who: e.who, detail: (e.type || '') + (e.note ? ' — ' + e.note : '')
  }));
  return exp.concat(sav);
}

function populateTableFilterOptions(){
  const whoSel = document.getElementById('filter-who');
  const catSel = document.getElementById('filter-category');
  const currentWhoF = whoSel.value || 'all';
  const currentCatF = catSel.value || 'all';

  const people = Array.from(new Set([...expenses.map(e=>e.who), ...savings.map(e=>e.who)]));
  whoSel.innerHTML = '<option value="all">All</option>' + people.map(p => `<option value="${p}">${p}</option>`).join('');
  if(people.includes(currentWhoF)) whoSel.value = currentWhoF;

  const typeF = document.getElementById('filter-type').value;
  const cats = new Set();
  if(typeF !== 'savings') expenses.forEach(e => cats.add(e.category));
  if(typeF !== 'expense') savings.forEach(e => cats.add(e.category));
  const catList = Array.from(cats);
  catSel.innerHTML = '<option value="all">All</option>' + catList.map(c => `<option value="${c}">${c}</option>`).join('');
  if(catList.includes(currentCatF)) catSel.value = currentCatF;
}

function getFilteredSortedEntries(){
  const typeF = document.getElementById('filter-type').value;
  const whoF = document.getElementById('filter-who').value;
  const catF = document.getElementById('filter-category').value;
  const fromF = document.getElementById('filter-from').value;
  const toF = document.getElementById('filter-to').value;

  let rows = buildAllEntries();
  if(typeF !== 'all') rows = rows.filter(r => r.kind === typeF);
  if(whoF !== 'all') rows = rows.filter(r => r.who === whoF);
  if(catF !== 'all') rows = rows.filter(r => r.category === catF);
  if(fromF) rows = rows.filter(r => r.date.slice(0,10) >= fromF);
  if(toF) rows = rows.filter(r => r.date.slice(0,10) <= toF);

  const dir = tableSort.dir === 'asc' ? 1 : -1;
  rows.sort((a,b) => {
    if(tableSort.col === 'amount') return (a.amount - b.amount) * dir;
    return String(a[tableSort.col]).localeCompare(String(b[tableSort.col])) * dir;
  });
  return rows;
}

function renderTable(){
  populateTableFilterOptions();
  const rows = getFilteredSortedEntries();
  const tbody = document.getElementById('entries-table-body');
  const emptyEl = document.getElementById('table-empty');

  const colLabels = { date:'Date', kind:'Type', category:'Category', who:'Who', amount:'Amount' };
  document.querySelectorAll('#entries-table th[data-col]').forEach(th => {
    const col = th.dataset.col;
    const isSorted = col === tableSort.col;
    th.classList.toggle('sorted', isSorted);
    const arrow = isSorted ? `<span class="sort-arrow">${tableSort.dir === 'asc' ? '▲' : '▼'}</span>` : '';
    th.innerHTML = colLabels[col] + arrow;
  });

  if(rows.length === 0){
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    document.getElementById('table-pager').innerHTML = '';
    return;
  }
  emptyEl.style.display = 'none';

  const { pageItems, page, totalPages } = paginate(rows, tablePage);
  tablePage = page;

  tbody.innerHTML = pageItems.map(r => `
    <tr>
      <td>${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</td>
      <td class="kind-${r.kind}">${r.kind === 'expense' ? 'Expense' : 'Saving'}</td>
      <td>${r.category}</td>
      <td>${r.who}</td>
      <td>${r.detail}</td>
      <td class="amt">${fmt(r.amount)}</td>
      <td>
        <div class="row-actions">
          <button data-id="${r.id}" data-kind="${r.kind}" data-action="edit" aria-label="Edit entry">Edit</button>
          <button data-id="${r.id}" data-kind="${r.kind}" data-action="delete" aria-label="Delete entry">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => startEdit(btn.dataset.kind, btn.dataset.id));
  });

  tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('Delete this entry?')) return;
      const id = btn.dataset.id;
      try {
        if(btn.dataset.kind === 'expense'){
          await deleteExpenseTx(id);
        } else {
          await deleteSavingsTx(id);
        }
      } catch(err){
        alert('Could not delete: ' + err.message);
      }
    });
  });

  renderPager('table-pager', tablePage, totalPages, rows.length, (p) => {
    tablePage = p;
    renderTable();
  });
}

document.querySelectorAll('#entries-table th[data-col]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if(tableSort.col === col){
      tableSort.dir = tableSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      tableSort.col = col;
      tableSort.dir = col === 'amount' ? 'desc' : 'asc';
    }
    tablePage = 1;
    renderTable();
  });
});

['filter-type','filter-who','filter-category','filter-from','filter-to'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    tablePage = 1;
    renderTable();
  });
});

document.getElementById('export-btn').addEventListener('click', () => {
  const rows = getFilteredSortedEntries();
  const data = rows.map(r => ({
    Date: new Date(r.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}),
    Type: r.kind === 'expense' ? 'Expense' : 'Saving',
    Category: r.category,
    Who: r.who,
    Detail: r.detail,
    Amount: r.amount
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Entries');
  XLSX.writeFile(wb, 'our-ledger-' + todayStr() + '.xlsx');
});
