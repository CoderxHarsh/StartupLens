// ========== DATA ==========
let transactions = [];


// ========== NAVIGATION ==========
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.querySelectorAll('.sidebar ul li').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active-page');
  const pages = ['dashboard', 'transactions', 'reports', 'ai'];
  document.querySelectorAll('.sidebar ul li')[pages.indexOf(page)].classList.add('active');
  if (page === 'reports') updateReportChart();
}

// ========== CSV UPLOAD + AI CATEGORIZE ==========
async function uploadCSV() {
  const file = document.getElementById('csvFile').files[0];
  const status = document.getElementById('uploadStatus');

  if (!file) {
    status.innerHTML = '<span class="status-error">⚠️ Pehle CSV file select karo!</span>';
    return;
  }

  status.innerHTML = '<span class="status-loading">🤖 AI analyze kar raha hai... thoda wait karo!</span>';

  const text = await file.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Column indexes dhundho
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('particular'));
  const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
  const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));

  if (descIdx === -1 || (debitIdx === -1 && creditIdx === -1)) {
    status.innerHTML = '<span class="status-error">❌ CSV format sahi nahi! Date, Description, Debit, Credit columns chahiye.</span>';
    return;
  }

  // Rows parse karo
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
    status.innerHTML = '<span class="status-error">❌ Koi valid transactions nahi mili CSV mein!</span>';
    return;
  }

  // AI se categories lo
  try {
    const prompt = `Tum ek financial categorization AI ho.
Neeche kuch bank transactions hain. Har transaction ke liye:
1. type: "income" ya "expense" batao
2. category: inme se ek choose karo — Salary, Funding, Freelance, Marketing, Infra, Tools, Misc

Transactions:
${rows.map((r, i) => `${i}. "${r.desc}" | Debit: ${r.debit} | Credit: ${r.credit}`).join('\n')}

Sirf JSON array return karo, kuch aur mat likho. Format:
[{"index":0,"type":"expense","category":"Marketing"},{"index":1,"type":"income","category":"Funding"}]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Tum sirf valid JSON return karte ho, kuch aur nahi.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    let aiText = data?.choices?.[0]?.message?.content || '[]';

    // JSON clean karo
    aiText = aiText.replace(/```json|```/g, '').trim();
    const categories = JSON.parse(aiText);

    // Transactions mein add karo
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

    status.innerHTML = `<span class="status-success">✅ ${categories.length} transactions successfully import ho gayi! Dashboard update ho gaya.</span>`;

  } catch (err) {
    console.error(err);
    status.innerHTML = '<span class="status-error">❌ AI error aaya! API key check karo ya dobara try karo.</span>';
  }
}

// ========== MANUAL ADD ==========
function addTransaction() {
  const type = document.getElementById('txType').value;
  const desc = document.getElementById('txDesc').value.trim();
  const category = document.getElementById('txCategory').value;
  const amount = parseFloat(document.getElementById('txAmount').value);

  if (!desc || !amount || amount <= 0) {
    alert('Description aur amount bharo!');
    return;
  }

  transactions.push({ date: new Date().toLocaleDateString('en-IN'), type, desc, category, amount });
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No transactions yet</td></tr>';
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

// ========== DASHBOARD UPDATE ==========
let expenseChart = null;

function updateDashboard() {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;
  const monthlyBurn = totalExpenses / (transactions.length > 0 ? 1 : 1);
  const runway = totalExpenses > 0 ? (netBalance / (totalExpenses / 12)).toFixed(1) : '--';

  document.getElementById('totalIncome').textContent = '₹' + totalIncome.toLocaleString('en-IN');
  document.getElementById('totalExpenses').textContent = '₹' + totalExpenses.toLocaleString('en-IN');
  document.getElementById('netBalance').textContent = '₹' + netBalance.toLocaleString('en-IN');
  document.getElementById('netBalance').style.color = netBalance >= 0 ? '#2e7d32' : '#c62828';
  document.getElementById('runway').textContent = runway !== '--' ? runway + ' months' : '-- months';

  // Chart
  const categories = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categories[t.category] = (categories[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);
  const colors = ['#e94560', '#0f3460', '#16213e', '#533483', '#05c46b', '#f5a623', '#7b68ee'];

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
          ticks: { callback: val => '₹' + val.toLocaleString('en-IN') }
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
  document.getElementById('rNet').style.color = net >= 0 ? '#2e7d32' : '#c62828';

  const ctx2 = document.getElementById('reportChart').getContext('2d');
  if (reportChart) reportChart.destroy();

  reportChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [totalIncome, totalExpenses],
        backgroundColor: ['#05c46b', '#e94560'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
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
  messages.innerHTML += `<div class="msg bot" id="thinking">Soch raha hoon... 🤔</div>`;
  messages.scrollTop = messages.scrollHeight;

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const context = `Tum ek startup financial assistant ho.
Current financial data:
- Total Income: ₹${totalIncome.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Net Balance: ₹${(totalIncome - totalExpenses).toLocaleString('en-IN')}
- Transactions: ${JSON.stringify(transactions.slice(-20))}
Short aur clear answers do Hindi ya English mein.`;

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
    const reply = data?.choices?.[0]?.message?.content || 'Kuch samajh nahi aaya!';
    document.getElementById('thinking').remove();
    messages.innerHTML += `<div class="msg bot">${reply}</div>`;
    messages.scrollTop = messages.scrollHeight;

  } catch (err) {
    document.getElementById('thinking').remove();
    messages.innerHTML += `<div class="msg bot">Error aaya! 😅</div>`;
  }
}

document.getElementById('userInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') sendMessage();
});