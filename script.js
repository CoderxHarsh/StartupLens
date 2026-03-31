// ========== DATA ==========
let transactions = [];

// ========== NAVIGATION ==========
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.querySelectorAll('.sidebar ul li').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active-page');
  const pages = ['dashboard', 'transactions', 'reports', 'forecast', 'ai'];
  document.querySelectorAll('.sidebar ul li')[pages.indexOf(page)].classList.add('active');
  if (page === 'reports') updateReportChart();
}

// ========== CSV UPLOAD ==========
async function uploadCSV() {
  const file = document.getElementById('csvFile').files[0];
  const status = document.getElementById('uploadStatus');

  if (!file) {
    status.innerHTML = '<span class="status-error">⚠️ Please select a CSV file first!</span>';
    return;
  }

  status.innerHTML = '<span class="status-loading">🤖 AI is analyzing your statement... please wait!</span>';

  const text = await file.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('particular'));
  const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
  const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));

  if (descIdx === -1 || (debitIdx === -1 && creditIdx === -1)) {
    status.innerHTML = '<span class="status-error">❌ Invalid CSV format!</span>';
    return;
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const desc = cols[descIdx] || '';
    const debit = parseFloat(cols[debitIdx]) || 0;
    const credit = parseFloat(cols[creditIdx]) || 0;
    const date = cols[dateIdx] || '';
    if (!desc || (debit === 0 && credit === 0)) continue;
    rows.push({ date, desc, debit, credit });
  }

  if (rows.length === 0) {
    status.innerHTML = '<span class="status-error">❌ No valid transactions found!</span>';
    return;
  }

  try {
    const prompt = `You are a financial categorization AI.
For each transaction below, return:
1. type: "income" or "expense"
2. category: Salary, Funding, Freelance, Marketing, Infra, Tools, or Misc

Transactions:
${rows.map((r, i) => `${i}. "${r.desc}" | Debit: ${r.debit} | Credit: ${r.credit}`).join('\n')}

Return ONLY a JSON array:
[{"index":0,"type":"expense","category":"Marketing"}]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You only return valid JSON, nothing else.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    let aiText = data?.choices?.[0]?.message?.content || '[]';
    aiText = aiText.replace(/```json|```/g, '').trim();
    const categories = JSON.parse(aiText);

    categories.forEach(c => {
      const row = rows[c.index];
      if (!row) return;
      transactions.push({
        date: row.date,
        type: c.type,
        desc: row.desc,
        category: c.category,
        amount: c.type === 'income' ? row.credit : row.debit
      });
    });

    renderTable();
    updateDashboard();
    status.innerHTML = `<span class="status-success">✅ ${categories.length} transactions imported!</span>`;

  } catch (err) {
    status.innerHTML = '<span class="status-error">❌ Error! Please try again.</span>';
  }
}

// ========== MANUAL ADD ==========
function addTransaction() {
  const type = document.getElementById('txType').value;
  const desc = document.getElementById('txDesc').value.trim();
  const category = document.getElementById('txCategory').value;
  const amount = parseFloat(document.getElementById('txAmount').value);

  if (!desc || !amount || amount <= 0) {
    alert('Please fill in description and amount!');
    return;
  }

  transactions.push({
    date: new Date().toLocaleDateString('en-IN'),
    type, desc, category, amount
  });

  document.getElementById('txDesc').value = '';
  document.getElementById('txAmount').value = '';
  renderTable();
  updateDashboard();
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  renderTable();
  updateDashboard();
}

// ========== RENDER TABLE ==========
function renderTable() {
  const tbody = document.getElementById('txTable');
  if (transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:rgba(255,255,255,0.4); padding:20px;">No transactions yet</td></tr>';
    return;
  }
  tbody.innerHTML = transactions.map((tx, i) => `
    <tr>
      <td>${tx.date || '-'}</td>
      <td><span class="badge-${tx.type}">${tx.type === 'income' ? '💰 Income' : '💸 Expense'}</span></td>
      <td>${tx.desc}</td>
      <td>${tx.category}</td>
      <td>₹${tx.amount.toLocaleString('en-IN')}</td>
      <td><button class="delete-btn" onclick="deleteTransaction(${i})">🗑️</button></td>
    </tr>
  `).join('');
}

// ========== DASHBOARD ==========
let expenseChart = null;

function updateDashboard() {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const runway = totalExpenses > 0 ? (netBalance / (totalExpenses / 12)).toFixed(1) : '--';

  document.getElementById('totalIncome').textContent = '₹' + totalIncome.toLocaleString('en-IN');
  document.getElementById('totalExpenses').textContent = '₹' + totalExpenses.toLocaleString('en-IN');
  document.getElementById('netBalance').textContent = '₹' + netBalance.toLocaleString('en-IN');
  document.getElementById('netBalance').style.color = netBalance >= 0 ? '#34d399' : '#f87171';
  document.getElementById('runway').textContent = runway !== '--' ? runway + ' months' : '-- months';

  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);
  const colors = ['#a78bfa', '#818cf8', '#6366f1', '#8b5cf6', '#34d399', '#fbbf24', '#f87171'];

  const ctx = document.getElementById('expenseChart').getContext('2d');
  if (expenseChart) expenseChart.destroy();
  if (labels.length === 0) return;

  expenseChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Expenses (₹)',
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 8,
      }]
    },
    options: {
      responsive: true,
      aspectRatio: 2,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'rgba(255,255,255,0.5)', callback: val => '₹' + val.toLocaleString('en-IN') },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: 'rgba(255,255,255,0.5)' },
          grid: { display: false }
        }
      }
    }
  });
}

// ========== REPORTS ==========
let reportChart = null;

function updateReportChart() {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpenses;

  document.getElementById('rIncome').textContent = '₹' + totalIncome.toLocaleString('en-IN');
  document.getElementById('rExpenses').textContent = '₹' + totalExpenses.toLocaleString('en-IN');
  document.getElementById('rNet').textContent = '₹' + net.toLocaleString('en-IN');
  document.getElementById('rNet').style.color = net >= 0 ? '#34d399' : '#f87171';

  const ctx2 = document.getElementById('reportChart').getContext('2d');
  if (reportChart) reportChart.destroy();

  reportChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [totalIncome, totalExpenses],
        backgroundColor: ['#34d399', '#f87171'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: 'rgba(255,255,255,0.6)' } }
      }
    }
  });
}

// ========== LINEAR REGRESSION FORECAST ==========
let forecastChart = null;

async function runForecast() {
  const expenses = [];
  for (let i = 1; i <= 6; i++) {
    const val = parseFloat(document.getElementById('m' + i).value);
    if (val && val > 0) expenses.push(val);
  }

  if (expenses.length < 2) {
    alert('Please enter at least 2 months of expenses!');
    return;
  }

  try {
    const response = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses })
    });

    const data = await response.json();

    // Show result cards
    document.getElementById('forecastResult').style.display = 'block';
    document.getElementById('pred1').textContent = '₹' + Math.round(data.predictions[0]).toLocaleString('en-IN');
    document.getElementById('pred2').textContent = '₹' + Math.round(data.predictions[1]).toLocaleString('en-IN');
    document.getElementById('pred3').textContent = '₹' + Math.round(data.predictions[2]).toLocaleString('en-IN');
    document.getElementById('r2score').textContent = (data.r2_score * 100).toFixed(0) + '%';

    // Insight
    const trend = data.slope > 0 ? `increasing by ₹${Math.abs(Math.round(data.slope)).toLocaleString('en-IN')} per month` : `decreasing by ₹${Math.abs(Math.round(data.slope)).toLocaleString('en-IN')} per month`;
    document.getElementById('forecastInsight').textContent = `💡 Your expenses are ${trend}. Model accuracy: ${(data.r2_score * 100).toFixed(0)}% — ${data.r2_score > 0.7 ? 'High confidence prediction!' : 'Add more months for better accuracy.'}`;

    // Chart
    const ctx3 = document.getElementById('forecastChart').getContext('2d');
    if (forecastChart) forecastChart.destroy();

    const actualLabels = expenses.map((_, i) => `Month ${i + 1}`);
    const predictedLabels = ['Next Month', 'Month +2', 'Month +3'];
    const allLabels = [...actualLabels, ...predictedLabels];

    forecastChart = new Chart(ctx3, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Actual Expenses',
            data: [...expenses, null, null, null],
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167,139,250,0.1)',
            borderWidth: 2,
            pointBackgroundColor: '#a78bfa',
            pointRadius: 5,
            tension: 0.4,
          },
          {
            label: 'Predicted Expenses',
            data: [...expenses.map(() => null), ...data.predictions.map(p => Math.round(p))],
            borderColor: '#34d399',
            backgroundColor: 'rgba(52,211,153,0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            pointBackgroundColor: '#34d399',
            pointRadius: 5,
            tension: 0.4,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: 'rgba(255,255,255,0.7)' } }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { color: 'rgba(255,255,255,0.5)', callback: val => '₹' + val.toLocaleString('en-IN') },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: 'rgba(255,255,255,0.5)' },
            grid: { display: false }
          }
        }
      }
    });

  } catch (err) {
    alert('Error connecting to ML backend! Make sure Flask server is running on port 5000.');
  }
}

// ========== AI ANOMALY DETECTION ==========
async function analyzeAnomalies() {
  const content = document.getElementById('insightsContent');

  if (transactions.length === 0) {
    content.innerHTML = '<p class="insights-hint">Please add some transactions first!</p>';
    return;
  }

  content.innerHTML = '<p class="insight-loading">🧠 AI is analyzing your finances...</p>';

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  });

  const prompt = `You are an expert startup financial analyst.

Financial data:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Balance: ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}
- Category wise expenses: ${JSON.stringify(categories)}

Give 3-4 insights in English. Return ONLY JSON:
[
  {"type": "warning", "insight": "..."},
  {"type": "good", "insight": "..."},
  {"type": "info", "insight": "..."}
]`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You only return valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    let aiText = data?.choices?.[0]?.message?.content || '[]';
    aiText = aiText.replace(/```json|```/g, '').trim();
    const insights = JSON.parse(aiText);
    const icons = { warning: '⚠️', good: '✅', info: '💡' };

    content.innerHTML = insights.map(i => `
      <div class="insight-card ${i.type}">${icons[i.type] || '💡'} ${i.insight}</div>
    `).join('');

  } catch (err) {
    content.innerHTML = '<p class="insights-hint">Error! Please try again.</p>';
  }
}

// ========== AI CHAT ==========
async function sendMessage() {
  const input = document.getElementById('userInput');
  const messages = document.getElementById('chatMessages');
  const userText = input.value.trim();
  if (!userText) return;

  messages.innerHTML += `<div class="msg user">${userText}</div>`;
  input.value = '';
  messages.scrollTop = messages.scrollHeight;
  messages.innerHTML += `<div class="msg bot" id="thinking">Thinking... 🤔</div>`;
  messages.scrollTop = messages.scrollHeight;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const context = `You are a startup financial assistant. Always respond in English only.
Current data:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Balance: ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}
- Transactions: ${JSON.stringify(transactions.slice(-20))}
Give short and clear answers in English.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: userText }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'Could not understand. Please try again!';
    document.getElementById('thinking').remove();
    messages.innerHTML += `<div class="msg bot">${reply}</div>`;
    messages.scrollTop = messages.scrollHeight;

  } catch (err) {
    document.getElementById('thinking').remove();
    messages.innerHTML += `<div class="msg bot">Error occurred! 😅</div>`;
  }
}

document.getElementById('userInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});