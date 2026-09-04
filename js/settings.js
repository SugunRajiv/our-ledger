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
}
applyCurrencyToUI();

document.getElementById('currency-select').addEventListener('change', (e) => {
  currencyCode = e.target.value;
  applyCurrencyToUI();
  render();
  db.ref('currency').set(currencyCode).catch(err => alert('Could not save currency: ' + err.message));
});

document.getElementById('language-select').addEventListener('change', (e) => {
  languageCode = e.target.value;
  db.ref('language').set(languageCode).catch(err => alert('Could not save language: ' + err.message));
});

document.addEventListener('click', (e) => {
  const menu = document.getElementById('user-menu');
  if(menu.open && !menu.contains(e.target)){
    menu.open = false;
  }
});
