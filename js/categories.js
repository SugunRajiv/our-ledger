function ensureOptionPresent(selectId, list, value){
  if(!value) return;
  populateSelect(selectId, list.includes(value) ? list : [value, ...list]);
}

async function saveCategories(){
  await householdRef().update({ categories });
}

async function saveSaveCategories(){
  await householdRef().update({ savingsCategories });
}

async function savePayTypes(){
  await householdRef().update({ payTypes });
}

async function renameFieldAcrossCollection(collectionName, field, oldValue, newValue){
  const snap = await householdRef().collection(collectionName).where(field, '==', oldValue).get();
  if(snap.empty) return;
  const batch = fs.batch();
  snap.docs.forEach(doc => batch.update(doc.ref, { [field]: newValue }));
  await batch.commit();
}

function populateSelect(id, list){
  const el = document.getElementById(id);
  const current = el.value;
  el.innerHTML = list.map(c => `<option value="${c}">${c}</option>`).join('')
    + `<option value="${ADD_NEW}">+ Add new...</option>`;
  if(list.includes(current)) el.value = current;
}

function renderManageList(containerId, list, kind){
  const el = document.getElementById(containerId);
  if(list.length === 0){
    el.innerHTML = '<div class="empty">None yet.</div>';
    return;
  }
  el.innerHTML = list.map(name => `
    <div class="manage-row">
      <div>${name}</div>
      <div class="actions">
        <button type="button" data-name="${name}" class="edit-item">Edit</button>
        <button type="button" data-name="${name}" class="danger delete-item">Delete</button>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('.edit-item').forEach(btn => btn.addEventListener('click', () => editListItem(kind, btn.dataset.name)));
  el.querySelectorAll('.delete-item').forEach(btn => btn.addEventListener('click', () => deleteListItem(kind, btn.dataset.name)));
}

async function editListItem(kind, oldName){
  const newName = prompt('Rename to', oldName);
  if(newName === null) return;
  const clean = newName.trim();
  if(!clean || clean === oldName) return;

  if(kind === 'category'){
    if(categories.includes(clean)){ alert('That category already exists.'); return; }
    categories = categories.map(c => c === oldName ? clean : c);
    await saveCategories();
    populateSelect('category', categories);
    renderManageList('manage-categories', categories, 'category');
    await renameFieldAcrossCollection('expenses', 'category', oldName, clean);
  } else if(kind === 'save-category'){
    if(savingsCategories.includes(clean)){ alert('That category already exists.'); return; }
    savingsCategories = savingsCategories.map(c => c === oldName ? clean : c);
    await saveSaveCategories();
    populateSelect('save-category', savingsCategories);
    renderManageList('manage-save-categories', savingsCategories, 'save-category');
    await renameFieldAcrossCollection('savings', 'category', oldName, clean);
  } else if(kind === 'paytype'){
    if(payTypes.includes(clean)){ alert('That payment type already exists.'); return; }
    payTypes = payTypes.map(t => t === oldName ? clean : t);
    await savePayTypes();
    populateSelect('paytype', payTypes);
    populateSelect('save-paytype', payTypes);
    renderManageList('manage-paytypes', payTypes, 'paytype');
    await renameFieldAcrossCollection('expenses', 'type', oldName, clean);
    await renameFieldAcrossCollection('savings', 'type', oldName, clean);
  }
}

async function deleteListItem(kind, name){
  if(!confirm(`Delete "${name}"? Existing entries keep it, but it won't appear as an option anymore.`)) return;

  if(kind === 'category'){
    categories = categories.filter(c => c !== name);
    await saveCategories();
    populateSelect('category', categories);
    renderManageList('manage-categories', categories, 'category');
  } else if(kind === 'save-category'){
    savingsCategories = savingsCategories.filter(c => c !== name);
    await saveSaveCategories();
    populateSelect('save-category', savingsCategories);
    renderManageList('manage-save-categories', savingsCategories, 'save-category');
  } else if(kind === 'paytype'){
    payTypes = payTypes.filter(t => t !== name);
    await savePayTypes();
    populateSelect('paytype', payTypes);
    populateSelect('save-paytype', payTypes);
    renderManageList('manage-paytypes', payTypes, 'paytype');
  }
}

document.getElementById('add-category-btn').addEventListener('click', async () => {
  const name = prompt('New category name');
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(!categories.includes(clean)) categories.push(clean);
  await saveCategories();
  populateSelect('category', categories);
  renderManageList('manage-categories', categories, 'category');
});

document.getElementById('add-save-category-btn').addEventListener('click', async () => {
  const name = prompt('New savings category');
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(!savingsCategories.includes(clean)) savingsCategories.push(clean);
  await saveSaveCategories();
  populateSelect('save-category', savingsCategories);
  renderManageList('manage-save-categories', savingsCategories, 'save-category');
});

document.getElementById('add-paytype-btn').addEventListener('click', async () => {
  const name = prompt('New payment type');
  if(!name || !name.trim()) return;
  const clean = name.trim();
  if(!payTypes.includes(clean)) payTypes.push(clean);
  await savePayTypes();
  populateSelect('paytype', payTypes);
  populateSelect('save-paytype', payTypes);
  renderManageList('manage-paytypes', payTypes, 'paytype');
});

document.getElementById('category').addEventListener('change', async (e) => {
  if(e.target.value === ADD_NEW){
    const name = prompt('New category name');
    if(name && name.trim()){
      const clean = name.trim();
      if(!categories.includes(clean)) categories.push(clean);
      await saveCategories();
      populateSelect('category', categories);
      document.getElementById('category').value = clean;
    } else {
      populateSelect('category', categories);
    }
  }
});

document.getElementById('save-category').addEventListener('change', async (e) => {
  if(e.target.value === ADD_NEW){
    const name = prompt('New savings category');
    if(name && name.trim()){
      const clean = name.trim();
      if(!savingsCategories.includes(clean)) savingsCategories.push(clean);
      await saveSaveCategories();
      populateSelect('save-category', savingsCategories);
      document.getElementById('save-category').value = clean;
    } else {
      populateSelect('save-category', savingsCategories);
    }
  }
});

document.getElementById('paytype').addEventListener('change', async (e) => {
  if(e.target.value === ADD_NEW){
    const name = prompt('New payment type');
    if(name && name.trim()){
      const clean = name.trim();
      if(!payTypes.includes(clean)) payTypes.push(clean);
      await savePayTypes();
      populateSelect('paytype', payTypes);
      populateSelect('save-paytype', payTypes);
      document.getElementById('paytype').value = clean;
    } else {
      populateSelect('paytype', payTypes);
    }
  }
});

document.getElementById('save-paytype').addEventListener('change', async (e) => {
  if(e.target.value === ADD_NEW){
    const name = prompt('New payment type');
    if(name && name.trim()){
      const clean = name.trim();
      if(!payTypes.includes(clean)) payTypes.push(clean);
      await savePayTypes();
      populateSelect('paytype', payTypes);
      populateSelect('save-paytype', payTypes);
      document.getElementById('save-paytype').value = clean;
    } else {
      populateSelect('save-paytype', payTypes);
    }
  }
});
