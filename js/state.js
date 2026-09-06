function setAppViewVisible(visible){
  document.getElementById('app-view').style.display = visible ? 'block' : 'none';
  document.getElementById('app-nav').style.display = visible ? 'flex' : 'none';
}

let expenses = [];
let savings = [];
let currentSaveWho = 'Sugun';
let categories = ['Groceries','Utilities','Transport','Dining','Health','Shopping','Rent','Other'];
let savingsCategories = ['Mutual funds','Stocks','Physical Gold','Chitti','Others'];
let payTypes = ['Cash','UPI','Card','Net banking','Other'];
let currentWho = 'Sugun';

let editingExpenseId = null;
let editingSavingsId = null;
let monthlyBudget = 0;
let loadedExpenses = false;
let loadedSavings = false;
let authMode = 'signin';
let tableSort = { col: 'date', dir: 'desc' };
let entriesListPage = 1;
let tablePage = 1;

let auth = null;
let fs = null;
let currentHouseholdId = null;
let householdMembers = {};
let activeUnsubscribes = [];

function detachListeners(){
  activeUnsubscribes.forEach(unsub => unsub());
  activeUnsubscribes = [];
}

function householdRef(){
  return fs.collection('households').doc(currentHouseholdId);
}

const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'en-IE' },
  GBP: { symbol: '£', locale: 'en-GB' },
};
let currencyCode = 'INR';
let languageCode = 'en';

function currencySymbol(){
  return (CURRENCIES[currencyCode] || CURRENCIES.INR).symbol;
}

function fmt(n){
  const c = CURRENCIES[currencyCode] || CURRENCIES.INR;
  return c.symbol + Number(n).toLocaleString(c.locale, {maximumFractionDigits:0});
}

function todayStr(){
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0,10);
}
document.getElementById('date').value = todayStr();
document.getElementById('save-date').value = todayStr();

function startOfWeek(d){
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0,0,0,0);
  return dt;
}

function startOfMonth(d){
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0,0,0,0);
  return dt;
}

function startOfYear(d){
  const dt = new Date(d);
  dt.setMonth(0, 1);
  dt.setHours(0,0,0,0);
  return dt;
}
