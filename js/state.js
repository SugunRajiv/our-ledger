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

let db = null;
let auth = null;

function fmt(n){
  return '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0});
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
