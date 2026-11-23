const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const statusEl = document.getElementById('status');
const memoryIndicator = document.getElementById('memoryIndicator');
const historyEl = document.getElementById('history');
let expression = '';
let lastAnswer = 0;
let memory = null;
let angleMode = 'DEG';
let justEvaluated = false;
let history = [];

const pretty = n => {
  if (!Number.isFinite(n)) throw new Error('Math error');
  if (Math.abs(n) < 1e-12) n = 0;
  return Number.parseFloat(n.toPrecision(12)).toString();
};
const update = () => {
  expressionEl.textContent = expression || '0';
  memoryIndicator.textContent = memory === null ? 'M: —' : `M: ${pretty(memory)}`;
};
const insert = value => {
  if (justEvaluated && /[0-9.(πe]/.test(value)) expression = '';
  justEvaluated = false;
  expression += value;
  update();
  preview();
};
const preview = () => {
  if (!expression) { resultEl.textContent = '0'; statusEl.textContent = 'Ready'; return; }
  try {
    const value = calculate(expression);
    resultEl.textContent = pretty(value);
    statusEl.textContent = 'Preview';
  } catch { resultEl.textContent = '…'; statusEl.textContent = ''; }
};
function factorial(n) {
  if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error('Invalid factorial');
  let r = 1; for (let i=2;i<=n;i++) r *= i; return r;
}
function calculate(input) {
  let s = input.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')
    .replaceAll('π','PI').replace(/\bAns\b/g, `(${lastAnswer})`);
  // Implicit multiplication: 2π, 2(3), )(, and function/constant adjacency.
  s = s.replace(/(\d|\)|PI|E)(?=(PI|E|sqrt|sin|cos|tan|log|ln|\())/g, '$1*');
  s = s.replace(/(PI|E|\))(?=\d)/g, '$1*');
  s = s.replace(/\bPI\b/g, 'Math.PI').replace(/\bE\b/g, 'Math.E');
  s = s.replace(/\^/g, '**');
  s = s.replace(/\bsqrt\(/g, 'Math.sqrt(')
       .replace(/\bsin\(/g, 'SIN(').replace(/\bcos\(/g, 'COS(').replace(/\btan\(/g, 'TAN(')
       .replace(/\blog\(/g, 'Math.log10(').replace(/\bln\(/g, 'Math.log(');
  s = s.replace(/(\d+(?:\.\d+)?|\([^()]*\))!/g, 'FACT($1)');
  s = s.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  const toRad = x => angleMode === 'DEG' ? x*Math.PI/180 : x;
  const scope = {
    SIN: x => Math.sin(toRad(x)), COS: x => Math.cos(toRad(x)),
    TAN: x => { const c=Math.cos(toRad(x)); if(Math.abs(c)<1e-12) throw new Error('Undefined'); return Math.tan(toRad(x)); },
    FACT: factorial
  };
  if (!/^[\d\s.+\-*/()%!,A-Za-z_*]*$/.test(s) || /(?:constructor|window|document|globalThis|eval|Function)/.test(s)) throw new Error('Invalid expression');
  // Only evaluate the constrained math grammar and locally supplied functions.
  const value = Function('Math','SIN','COS','TAN','FACT', `"use strict"; return (${s});`)(Math,scope.SIN,scope.COS,scope.TAN,scope.FACT);
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Math error');
  return value;
}
function showError(message='Invalid expression') { resultEl.textContent='Error'; statusEl.textContent=message; }
function equals() {
  if (!expression) return;
  try {
    const value = calculate(expression), formatted = pretty(value);
    history.unshift({ expression, result: formatted });
    history = history.slice(0,30);
    lastAnswer = value;
    resultEl.textContent = formatted;
    statusEl.textContent = 'Calculated';
    renderHistory();
    expression = formatted;
    justEvaluated = true;
    update();
  } catch (e) { showError(e.message === 'Math error' ? 'Math error' : 'Check expression'); }
}
function renderHistory() {
  historyEl.innerHTML = '';
  if (!history.length) { historyEl.innerHTML='<p class="empty-history">Your calculations will appear here.</p>'; return; }
  history.forEach(item => {
    const el=document.createElement('button'); el.className='history-item';
    const exp=document.createElement('div'); exp.className='history-expression'; exp.textContent=item.expression;
    const res=document.createElement('div'); res.className='history-result'; res.textContent='= '+item.result;
    el.append(exp,res); el.addEventListener('click',()=>{expression=item.result;justEvaluated=true;update();preview();});
    historyEl.append(el);
  });
}
function currentValue() { return expression ? calculate(expression) : lastAnswer; }
function backspace() { expression=expression.slice(0,-1);justEvaluated=false;update();preview(); }
function clear() { expression='';justEvaluated=false;update();preview(); }
function action(name) {
  try {
    switch(name) {
      case 'clear': clear(); break;
      case 'backspace': backspace(); break;
      case 'equals': equals(); break;
      case 'percent': insert('%'); break;
      case 'square': expression=`(${expression || '0'})^2`;justEvaluated=false;update();preview();break;
      case 'reciprocal': expression=`1/(${expression || '0'})`;justEvaluated=false;update();preview();break;
      case 'sign': expression=`-(${expression || '0'})`;justEvaluated=false;update();preview();break;
      case 'ans': insert('Ans'); break;
      case 'memory-clear': memory=null;update();statusEl.textContent='Memory cleared';break;
      case 'memory-recall': if(memory!==null) insert(`(${pretty(memory)})`);break;
      case 'memory-add': memory=(memory||0)+currentValue();update();statusEl.textContent='Added to memory';break;
      case 'memory-subtract': memory=(memory||0)-currentValue();update();statusEl.textContent='Subtracted from memory';break;
      case 'memory-store': memory=currentValue();update();statusEl.textContent='Stored in memory';break;
    }
  } catch { showError('Nothing to calculate'); }
}
document.querySelectorAll('[data-value]').forEach(btn=>btn.addEventListener('click',()=>insert(btn.dataset.value)));
document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.action)));
document.getElementById('angleMode').addEventListener('click',e=>{angleMode=angleMode==='DEG'?'RAD':'DEG';e.currentTarget.textContent=angleMode;preview();});
document.getElementById('themeToggle').addEventListener('click',()=>document.body.classList.toggle('light'));
document.getElementById('clearHistory').addEventListener('click',()=>{history=[];renderHistory();});
document.addEventListener('keydown',e=>{
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^[0-9.]$/.test(e.key)) insert(e.key);
  else if (e.key==='+') insert('+');
  else if (e.key==='-') insert('−');
  else if (e.key==='*') insert('×');
  else if (e.key==='/') {e.preventDefault();insert('÷');}
  else if (e.key==='^') insert('^');
  else if (e.key==='(' || e.key===')' || e.key==='%' || e.key==='!') insert(e.key);
  else if (e.key==='Enter' || e.key==='=') {e.preventDefault();equals();}
  else if (e.key==='Backspace') backspace();
  else if (e.key==='Escape') clear();
});
update(); renderHistory();