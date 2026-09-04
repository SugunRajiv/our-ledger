function initFirebase(){
  if(firebaseConfig.apiKey === "YOUR_API_KEY"){
    document.getElementById('config-banner').style.display = 'block';
    return;
  }
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  auth = firebase.auth();

  auth.onAuthStateChanged(user => {
    const isUnverifiedPassword = user && !user.emailVerified &&
      user.providerData.some(p => p.providerId === 'password');

    document.getElementById('login-view').style.display = (user) ? 'none' : 'block';
    document.getElementById('verify-view').style.display = isUnverifiedPassword ? 'block' : 'none';
    document.getElementById('app-view').style.display = (user && !isUnverifiedPassword) ? 'block' : 'none';

    if(user && !isUnverifiedPassword){
      attachListeners();
    }
  });
}

function checkLoaded(){
  if(loadedExpenses && loadedSavings){
    document.getElementById('loading-banner').style.display = 'none';
  }
}

function attachListeners(){
  db.ref('expenses').on('value', snap => {
    expenses = snap.val() || [];
    loadedExpenses = true;
    checkLoaded();
    render();
  }, () => {
    document.getElementById('login-error').style.display = 'block';
    auth.signOut();
  });
  db.ref('savings').on('value', snap => {
    savings = snap.val() || [];
    loadedSavings = true;
    checkLoaded();
    render();
  });
  db.ref('budget').on('value', snap => {
    monthlyBudget = snap.val() || 0;
    render();
  });
  db.ref('categories').on('value', snap => {
    categories = snap.val() || categories;
    populateSelect('category', categories);
    renderManageList('manage-categories', categories, 'category');
  });
  db.ref('save_categories').on('value', snap => {
    savingsCategories = snap.val() || savingsCategories;
    populateSelect('save-category', savingsCategories);
    renderManageList('manage-save-categories', savingsCategories, 'save-category');
  });
  db.ref('paytypes').on('value', snap => {
    payTypes = snap.val() || payTypes;
    populateSelect('paytype', payTypes);
    populateSelect('save-paytype', payTypes);
    renderManageList('manage-paytypes', payTypes, 'paytype');
  });
}

document.getElementById('login-btn').addEventListener('click', () => {
  const errorEl = document.getElementById('login-error');
  errorEl.style.display = 'none';
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(() => {
    errorEl.style.display = 'block';
  });
});

document.getElementById('logout-btn').addEventListener('click', () => {
  auth.signOut();
});

document.getElementById('verify-logout-btn').addEventListener('click', () => {
  auth.signOut();
});

document.getElementById('resend-verify-btn').addEventListener('click', () => {
  const infoEl = document.getElementById('verify-info');
  auth.currentUser.sendEmailVerification()
    .then(() => {
      infoEl.textContent = 'Verification email sent. Check your inbox.';
      infoEl.style.display = 'block';
    })
    .catch(err => {
      infoEl.textContent = err.message;
      infoEl.style.display = 'block';
    });
});

function authErrorMessage(err){
  switch(err.code){
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/missing-password': return 'Enter a password.';
    default: return err.message;
  }
}

function setEmailError(msg){
  const el = document.getElementById('email-error');
  document.getElementById('email-info').style.display = 'none';
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

function setEmailInfo(msg){
  const el = document.getElementById('email-info');
  document.getElementById('email-error').style.display = 'none';
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

document.getElementById('toggle-mode-btn').addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'register' : 'signin';
  document.getElementById('email-submit-btn').textContent = authMode === 'signin' ? 'Sign in' : 'Create account';
  document.getElementById('toggle-mode-btn').textContent = authMode === 'signin' ? 'Create an account' : 'Already have an account? Sign in';
  setEmailError('');
  setEmailInfo('');
});

document.getElementById('forgot-btn').addEventListener('click', () => {
  const email = document.getElementById('email-input').value.trim();
  if(!email){
    setEmailError('Enter your email above first.');
    return;
  }
  auth.sendPasswordResetEmail(email)
    .then(() => setEmailInfo('Password reset email sent. Check your inbox.'))
    .catch(err => setEmailError(authErrorMessage(err)));
});

document.getElementById('email-submit-btn').addEventListener('click', () => {
  const email = document.getElementById('email-input').value.trim();
  const password = document.getElementById('password-input').value;
  setEmailError('');
  setEmailInfo('');

  if(!email || !password){
    setEmailError('Enter both email and password.');
    return;
  }

  if(authMode === 'signin'){
    auth.signInWithEmailAndPassword(email, password)
      .catch(err => setEmailError(authErrorMessage(err)));
  } else {
    auth.createUserWithEmailAndPassword(email, password)
      .then(cred => cred.user.sendEmailVerification())
      .then(() => auth.signOut())
      .then(() => {
        document.getElementById('toggle-mode-btn').click();
        setEmailInfo('Account created. Check your email to verify, then sign in.');
      })
      .catch(err => setEmailError(authErrorMessage(err)));
  }
});
