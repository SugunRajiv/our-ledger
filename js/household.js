function generateInviteCode(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for(let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function memberDisplayName(user){
  return user.displayName || (user.email ? user.email.split('@')[0] : 'Member');
}

// Pre-fill the join form if this page was opened via a shared invite link.
const urlInviteCode = new URLSearchParams(location.search).get('invite');
if(urlInviteCode){
  document.getElementById('invite-code-input').value = urlInviteCode.trim().toUpperCase();
}

function inviteLinkFor(code){
  return location.origin + location.pathname + '?invite=' + code;
}

function updateInviteShareLinks(code){
  if(!code || code === '------') return;
  document.getElementById('copy-invite-link-btn').dataset.link = inviteLinkFor(code);
}

// Combines whatever the user has typed into the message box with the fixed
// invite link, which is always appended and never itself editable.
function buildInviteMessage(){
  const link = document.getElementById('copy-invite-link-btn').dataset.link;
  const custom = document.getElementById('invite-message-input').value.trim();
  return (custom ? custom + '\n\n' : '') + link;
}

document.getElementById('copy-invite-link-btn').addEventListener('click', () => {
  const link = document.getElementById('copy-invite-link-btn').dataset.link;
  if(!link) return;
  navigator.clipboard.writeText(link).catch(() => {});
});

document.getElementById('send-whatsapp-btn').addEventListener('click', () => {
  const digits = document.getElementById('whatsapp-number-input').value.replace(/[^0-9]/g, '');
  if(!digits){
    alert('Enter a WhatsApp number, including country code.');
    return;
  }
  if(!document.getElementById('copy-invite-link-btn').dataset.link){
    alert('No invite link available yet - try again in a moment.');
    return;
  }
  window.open('https://wa.me/' + digits + '?text=' + encodeURIComponent(buildInviteMessage()), '_blank', 'noopener');
});

document.getElementById('send-email-btn').addEventListener('click', () => {
  const email = document.getElementById('email-recipient-input').value.trim();
  if(!email){
    alert('Enter an email address to send to.');
    return;
  }
  if(!document.getElementById('copy-invite-link-btn').dataset.link){
    alert('No invite link available yet - try again in a moment.');
    return;
  }
  location.href = 'mailto:' + encodeURIComponent(email)
    + '?subject=' + encodeURIComponent('Join our household ledger')
    + '&body=' + encodeURIComponent(buildInviteMessage());
});

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

function renderMembersList(data){
  const container = document.getElementById('household-members-list');
  const myUid = auth.currentUser.uid;
  const isOwner = data.ownerUid === myUid;
  const entries = Object.entries(data.members || {});
  const pending = Object.keys(data.pendingInvites || {});

  const memberRows = entries.map(([uid, m]) => {
    const isMe = uid === myUid;
    const label = m.displayName + (uid === data.ownerUid ? ' (owner)' : '');
    let actions = '';
    if(isMe){
      actions += `<button type="button" data-action="rename">Rename</button>`;
      if(!isOwner) actions += `<button type="button" class="danger" data-action="leave">Leave</button>`;
    } else if(isOwner){
      actions += `<button type="button" class="danger" data-action="remove" data-uid="${uid}">Remove</button>`;
    }
    return `<div class="manage-row"><div>${label}</div><div class="actions">${actions}</div></div>`;
  }).join('');

  const pendingRows = pending.map(email => `
    <div class="manage-row">
      <div>${email} <span class="pending-tag">Pending</span></div>
      <div class="actions"><button type="button" class="danger" data-action="cancel-invite" data-email="${email}">Cancel</button></div>
    </div>
  `).join('');

  container.innerHTML = memberRows + pendingRows;

  container.querySelectorAll('[data-action="rename"]').forEach(btn => {
    btn.addEventListener('click', () => renameSelf(entries.find(([u]) => u === myUid)[1].displayName));
  });
  container.querySelectorAll('[data-action="leave"]').forEach(btn => {
    btn.addEventListener('click', () => leaveHousehold());
  });
  container.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const name = data.members[uid] ? data.members[uid].displayName : 'this member';
      removeMember(uid, name);
    });
  });
  container.querySelectorAll('[data-action="cancel-invite"]').forEach(btn => {
    btn.addEventListener('click', () => cancelPendingInvite(btn.dataset.email));
  });
}

async function renameSelf(currentName){
  const newName = prompt('Your display name', currentName);
  if(newName === null) return;
  const clean = newName.trim();
  if(!clean || clean === currentName) return;
  try {
    await householdRef().update({ [`members.${auth.currentUser.uid}.displayName`]: clean });
  } catch(err){
    alert('Could not rename: ' + err.message);
  }
}

async function removeMember(uid, name){
  if(!confirm(`Remove ${name} from the household?`)) return;
  try {
    await householdRef().update({
      memberUids: firebase.firestore.FieldValue.arrayRemove(uid),
      [`members.${uid}`]: firebase.firestore.FieldValue.delete()
    });
  } catch(err){
    alert('Could not remove: ' + err.message);
  }
}

async function inviteMemberByEmail(rawEmail){
  const email = rawEmail.trim().toLowerCase();
  if(!email || !email.includes('@')) throw new Error('Enter a valid email address.');

  const inviteDoc = await fs.collection('invites').doc(email).get();
  if(inviteDoc.exists) throw new Error('That email already has a pending invite.');

  const existingMember = Object.values(householdMembers).some(m => (m.email || '').toLowerCase() === email);
  if(existingMember) throw new Error('That email is already a member of this household.');

  await fs.collection('invites').doc(email).set({
    householdId: currentHouseholdId,
    invitedBy: auth.currentUser.uid,
  });
  // Emails contain dots, so a dotted string key like `pendingInvites.${email}`
  // would be misread as multiple nested path segments - FieldPath treats the
  // email as one literal segment regardless of dots inside it.
  await householdRef().update(new firebase.firestore.FieldPath('pendingInvites', email), true);
}

async function cancelPendingInvite(email){
  if(!confirm(`Cancel the invite to ${email}?`)) return;
  try {
    await fs.collection('invites').doc(email).delete();
    await householdRef().update(new firebase.firestore.FieldPath('pendingInvites', email), firebase.firestore.FieldValue.delete());
  } catch(err){
    alert('Could not cancel invite: ' + err.message);
  }
}

// If this signed-in user has a pending email invite, accept it automatically
// instead of showing the create/join setup screen.
async function tryAcceptPendingInvite(user){
  if(!user.email) return false;
  const email = user.email.toLowerCase();
  const inviteDoc = await fs.collection('invites').doc(email).get();
  if(!inviteDoc.exists) return false;

  const { householdId } = inviteDoc.data();
  const ref = fs.collection('households').doc(householdId);
  const displayName = memberDisplayName(user);

  await ref.update(
    'memberUids', firebase.firestore.FieldValue.arrayUnion(user.uid),
    new firebase.firestore.FieldPath('members', user.uid), { displayName, email: user.email || '' },
    new firebase.firestore.FieldPath('pendingInvites', email), firebase.firestore.FieldValue.delete()
  );
  await fs.collection('users').doc(user.uid).set({ householdId, displayName, email: user.email || '' });
  await fs.collection('invites').doc(email).delete();

  enterApp(householdId);
  return true;
}

document.getElementById('invite-email-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('invite-email-error');
  const input = document.getElementById('invite-email-input');
  errorEl.style.display = 'none';
  const btn = document.getElementById('invite-email-btn');
  btn.disabled = true;
  try {
    await inviteMemberByEmail(input.value);
    input.value = '';
  } catch(err){
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
});

async function leaveHousehold(){
  if(!confirm('Leave this household? You will need an invite code to rejoin.')) return;
  try {
    const user = auth.currentUser;
    detachListeners();
    await householdRef().update({
      memberUids: firebase.firestore.FieldValue.arrayRemove(user.uid),
      [`members.${user.uid}`]: firebase.firestore.FieldValue.delete()
    });
    await fs.collection('users').doc(user.uid).delete();
    currentHouseholdId = null;
    document.getElementById('household-dialog').close();
    document.getElementById('app-view').style.display = 'none';
    resolveHousehold(user);
  } catch(err){
    alert('Could not leave household: ' + err.message);
  }
}

function enterApp(householdId){
  currentHouseholdId = householdId;
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';
  attachListeners();
  if(location.search.includes('invite=')){
    history.replaceState(null, '', location.pathname);
  }
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
      ownerUid: user.uid,
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
