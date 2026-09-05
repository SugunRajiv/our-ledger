function addExpenseTx(entry){
  return householdRef().collection('expenses').add(entry);
}
function updateExpenseTx(id, updated){
  return householdRef().collection('expenses').doc(id).update(updated);
}
function deleteExpenseTx(id){
  return householdRef().collection('expenses').doc(id).delete();
}
function addSavingsTx(entry){
  return householdRef().collection('savings').add(entry);
}
function updateSavingsTx(id, updated){
  return householdRef().collection('savings').doc(id).update(updated);
}
function deleteSavingsTx(id){
  return householdRef().collection('savings').doc(id).delete();
}

function startEdit(kind, id){
  if(kind === 'expense'){
    const e = expenses.find(x => x.id === id);
    if(!e) return;
    editingExpenseId = id;
    document.getElementById('amount').value = e.amount;
    ensureOptionPresent('category', categories, e.category);
    document.getElementById('category').value = e.category;
    ensureOptionPresent('paytype', payTypes, e.type);
    document.getElementById('paytype').value = e.type || '';
    document.getElementById('note').value = e.note || '';
    document.getElementById('date').value = e.date.slice(0,10);
    currentWho = e.who;
    document.querySelectorAll('#exp-who button').forEach(b => b.classList.toggle('active', b.dataset.who === e.who));
    document.getElementById('add-btn').textContent = 'Update expense';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    document.getElementById('expense-dialog').showModal();
  } else {
    const e = savings.find(x => x.id === id);
    if(!e) return;
    editingSavingsId = id;
    document.getElementById('save-amount').value = e.amount;
    ensureOptionPresent('save-category', savingsCategories, e.category);
    document.getElementById('save-category').value = e.category;
    ensureOptionPresent('save-paytype', payTypes, e.type);
    document.getElementById('save-paytype').value = e.type || '';
    document.getElementById('save-note').value = e.note || '';
    document.getElementById('save-date').value = e.date.slice(0,10);
    currentSaveWho = e.who;
    document.querySelectorAll('#save-who button').forEach(b => b.classList.toggle('active', b.dataset.who === e.who));
    document.getElementById('save-add-btn').textContent = 'Update savings';
    document.getElementById('cancel-edit-save-btn').style.display = 'inline-block';
    document.getElementById('savings-dialog').showModal();
  }
}

function cancelEditExpense(){
  editingExpenseId = null;
  document.getElementById('add-btn').textContent = 'Add expense';
  document.getElementById('cancel-edit-btn').style.display = 'none';
  document.getElementById('amount').value = '';
  document.getElementById('note').value = '';
  document.getElementById('date').value = todayStr();
}

function cancelEditSavings(){
  editingSavingsId = null;
  document.getElementById('save-add-btn').textContent = 'Add savings';
  document.getElementById('cancel-edit-save-btn').style.display = 'none';
  document.getElementById('save-amount').value = '';
  document.getElementById('save-note').value = '';
  document.getElementById('save-date').value = todayStr();
}

document.getElementById('add-btn').addEventListener('click', async () => {
  const amountEl = document.getElementById('amount');
  const errorEl = document.getElementById('error-msg');
  const amount = parseFloat(amountEl.value);

  if(!amount || amount <= 0){
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  const category = document.getElementById('category').value;
  const type = document.getElementById('paytype').value;
  const note = document.getElementById('note').value.trim();
  const dateVal = document.getElementById('date').value || todayStr();

  const entry = {
    amount, category, type, note, who: currentWho,
    date: new Date(dateVal + 'T12:00:00').toISOString()
  };

  try {
    if(editingExpenseId){
      await updateExpenseTx(editingExpenseId, entry);
      cancelEditExpense();
    } else {
      await addExpenseTx(entry);
      amountEl.value = '';
      document.getElementById('note').value = '';
    }
    document.getElementById('expense-dialog').close();
  } catch(err){
    alert('Could not save: ' + err.message);
  }
});

document.getElementById('amount').addEventListener('input', () => {
  document.getElementById('error-msg').style.display = 'none';
});

document.getElementById('save-add-btn').addEventListener('click', async () => {
  const amountEl = document.getElementById('save-amount');
  const errorEl = document.getElementById('save-error-msg');
  const amount = parseFloat(amountEl.value);

  if(!amount || amount <= 0){
    errorEl.style.display = 'block';
    return;
  }
  errorEl.style.display = 'none';

  const note = document.getElementById('save-note').value.trim();
  const category = document.getElementById('save-category').value;
  const type = document.getElementById('save-paytype').value;
  const dateVal = document.getElementById('save-date').value || todayStr();
  const entry = {
    amount, category, type, note, who: currentSaveWho,
    date: new Date(dateVal + 'T12:00:00').toISOString()
  };

  try {
    if(editingSavingsId){
      await updateSavingsTx(editingSavingsId, entry);
      cancelEditSavings();
    } else {
      await addSavingsTx(entry);
      amountEl.value = '';
      document.getElementById('save-note').value = '';
    }
    document.getElementById('savings-dialog').close();
  } catch(err){
    alert('Could not save: ' + err.message);
  }
});

document.getElementById('save-amount').addEventListener('input', () => {
  document.getElementById('save-error-msg').style.display = 'none';
});


document.getElementById('backup-btn').addEventListener('click', () => {
  const backup = {
    exportedAt: new Date().toISOString(),
    expenses, savings, categories, savingsCategories, payTypes,
    budget: monthlyBudget
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'our-ledger-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('restore-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if(!file) return;

  const resetInput = () => { e.target.value = ''; };

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch(err){
    alert('That file is not valid JSON.');
    resetInput();
    return;
  }

  if(!Array.isArray(data.expenses) || !Array.isArray(data.savings)){
    alert('That file does not look like an Our Ledger backup.');
    resetInput();
    return;
  }

  if(!confirm('This will REPLACE all current expenses, savings, categories, and settings with the contents of this backup. This cannot be undone. Continue?')){
    resetInput();
    return;
  }

  try {
    const expCol = householdRef().collection('expenses');
    const savCol = householdRef().collection('savings');
    const [existingExp, existingSav] = await Promise.all([expCol.get(), savCol.get()]);

    let batch = fs.batch();
    let opCount = 0;
    const flushIfFull = async () => {
      if(opCount >= 450){
        await batch.commit();
        batch = fs.batch();
        opCount = 0;
      }
    };

    for(const doc of existingExp.docs){ batch.delete(doc.ref); opCount++; await flushIfFull(); }
    for(const doc of existingSav.docs){ batch.delete(doc.ref); opCount++; await flushIfFull(); }
    for(const entry of data.expenses){ const { id, ...rest } = entry; batch.set(expCol.doc(), rest); opCount++; await flushIfFull(); }
    for(const entry of data.savings){ const { id, ...rest } = entry; batch.set(savCol.doc(), rest); opCount++; await flushIfFull(); }
    await batch.commit();

    const householdUpdate = {};
    if(Array.isArray(data.categories)) householdUpdate.categories = data.categories;
    if(Array.isArray(data.savingsCategories)) householdUpdate.savingsCategories = data.savingsCategories;
    if(Array.isArray(data.payTypes)) householdUpdate.payTypes = data.payTypes;
    if(typeof data.budget === 'number') householdUpdate.monthlyBudget = data.budget;
    if(Object.keys(householdUpdate).length) await householdRef().update(householdUpdate);

    alert('Backup restored.');
  } catch(err){
    alert('Could not restore backup: ' + err.message);
  }
  resetInput();
});
