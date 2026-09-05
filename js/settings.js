function updateUserBadge(user){
  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name-label');
  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Account');

  nameEl.textContent = displayName;
  if(user.photoURL){
    avatarEl.innerHTML = `<img src="${user.photoURL}" alt="">`;
  } else {
    avatarEl.textContent = displayName.charAt(0).toUpperCase();
  }
}

function applyCurrencyToUI(){
  document.getElementById('currency-select').value = currencyCode;
  const label = `Amount (${currencySymbol()})`;
  document.getElementById('amount-label').textContent = label;
  document.getElementById('save-amount-label').textContent = label;
  document.getElementById('budget-input-label').textContent = `Monthly budget (${currencySymbol()})`;
}
applyCurrencyToUI();

function applyBudgetToUI(){
  const el = document.getElementById('budget-input');
  if(document.activeElement !== el){
    el.value = monthlyBudget || '';
  }
}
applyBudgetToUI();

document.getElementById('currency-select').addEventListener('change', (e) => {
  currencyCode = e.target.value;
  applyCurrencyToUI();
  render();
  householdRef().update({ currency: currencyCode }).catch(err => alert('Could not save currency: ' + err.message));
});

document.getElementById('language-select').addEventListener('change', (e) => {
  languageCode = e.target.value;
  householdRef().update({ language: languageCode }).catch(err => alert('Could not save language: ' + err.message));
});

document.getElementById('budget-input').addEventListener('change', (e) => {
  const val = e.target.value.trim();
  const num = val === '' ? 0 : parseFloat(val);
  if(isNaN(num) || num < 0){
    alert('Enter a valid, non-negative number.');
    applyBudgetToUI();
    return;
  }
  monthlyBudget = num;
  householdRef().update({ monthlyBudget: num }).catch(err => alert('Could not save budget: ' + err.message));
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if(menu.open && !menu.contains(e.target)){
    menu.open = false;
  }
});
