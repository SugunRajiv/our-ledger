function generateInviteCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function memberDisplayName(user){
  return user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
}

function renderWhoButtons(){
  const names = Object.values(householdMembers).map(m => m.displayName).filter(Boolean);
  if(names.length === 0) return;

  if(!names.includes(currentWho)) currentWho = names[0];
  if(!names.includes(currentSaveWho)) currentSaveWho = names[0];

  [['exp-who', () => currentWho], ['save-who', () => currentSaveWho]].forEach(([groupId, getCurrent]) => {
    const group = document.getElementById(groupId);
    const current = getCurrent();
    group.innerHTML = names.map(n => `<button type="button" class="${n === current ? 'active' : ''}" data-who="${n}">${n}</button>`).join('');
    group.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if(groupId === 'exp-who') currentWho = btn.dataset.who; else currentSaveWho = btn.dataset.who;
      });
    });
  });
}

function enterApp(householdId){
  currentHouseholdId = householdId;
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';
  attachListeners();
}

document.getElementById('create-household-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('create-household-error');
  errorEl.style.display = 'none';
  const name = document.getElementById('household-name-input').value.trim();
  if(!name){
    errorEl.textContent = 'Enter a household name.';
    errorEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('create-household-btn');
  btn.disabled = true;
  try {
    const user = auth.currentUser;
    const displayName = memberDisplayName(user);
    const newHouseholdRef = fs.collection('households').doc();
    const code = generateInviteCode();

    await newHouseholdRef.set({
      name,
      inviteCode: code,
      memberUids: [user.uid],
      members: { [user.uid]: { displayName, email: user.email || '' } },
      currency: 'INR',
      language: 'en',
      monthlyBudget: 0,
      categories: ['Groceries','Utilities','Transport','Dining','Health','Shopping','Rent','Other'],
      savingsCategories: ['Mutual funds','Stocks','Physical Gold','Chitti','Others'],
      payTypes: ['Cash','UPI','Card','Net banking','Other']
    });
    await fs.collection('inviteCodes').doc(code).set({ householdId: newHouseholdRef.id });
    await fs.collection('users').doc(user.uid).set({ householdId: newHouseholdRef.id, displayName, email: user.email || '' });

    enterApp(newHouseholdRef.id);
  } catch(err){
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('join-household-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('join-household-error');
  errorEl.style.display = 'none';
  const code = document.getElementById('invite-code-input').value.trim().toUpperCase();
  if(!code){
    errorEl.textContent = 'Enter an invite code.';
    errorEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('join-household-btn');
  btn.disabled = true;
  try {
    const user = auth.currentUser;
    const codeDoc = await fs.collection('inviteCodes').doc(code).get();
    if(!codeDoc.exists){
      errorEl.textContent = 'That invite code was not found.';
      errorEl.style.display = 'block';
      return;
    }

    const householdId = codeDoc.data().householdId;
    const ref = fs.collection('households').doc(householdId);
    const displayName = memberDisplayName(user);

    await ref.update({ memberUids: firebase.firestore.FieldValue.arrayUnion(user.uid) });
    await ref.update({ [`members.${user.uid}`]: { displayName, email: user.email || '' } });
    await fs.collection('users').doc(user.uid).set({ householdId, displayName, email: user.email || '' });

    enterApp(householdId);
  } catch(err){
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('setup-logout-btn').addEventListener('click', () => {
  auth.signOut();
});

document.getElementById('copy-invite-code-btn').addEventListener('click', () => {
  const code = document.getElementById('household-invite-code').textContent;
  if(!code || code === '------') return;
  navigator.clipboard.writeText(code).catch(() => {});
});
