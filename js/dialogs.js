document.getElementById('open-expense-btn').addEventListener('click', () => document.getElementById('expense-dialog').showModal());
document.getElementById('open-savings-btn').addEventListener('click', () => document.getElementById('savings-dialog').showModal());
document.getElementById('close-expense-dialog').addEventListener('click', () => document.getElementById('expense-dialog').close());
document.getElementById('close-savings-dialog').addEventListener('click', () => document.getElementById('savings-dialog').close());
document.getElementById('cancel-edit-btn').addEventListener('click', () => document.getElementById('expense-dialog').close());
document.getElementById('cancel-edit-save-btn').addEventListener('click', () => document.getElementById('savings-dialog').close());

[['expense-dialog', () => cancelEditExpense()], ['savings-dialog', () => cancelEditSavings()]].forEach(([id, resetFn]) => {
  const dlg = document.getElementById(id);
  dlg.addEventListener('close', resetFn);
  dlg.addEventListener('click', (e) => { if(e.target === dlg) dlg.close(); });
});

document.getElementById('open-categories-btn').addEventListener('click', () => {
  document.getElementById('user-menu').open = false;
  document.getElementById('categories-dialog').showModal();
});
document.getElementById('close-categories-dialog').addEventListener('click', () => document.getElementById('categories-dialog').close());
document.getElementById('categories-dialog').addEventListener('click', (e) => {
  const dlg = document.getElementById('categories-dialog');
  if(e.target === dlg) dlg.close();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-panel-' + btn.dataset.tab).classList.add('active');
  });
});
