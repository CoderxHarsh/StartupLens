# 💡 StartupLens — AI-Powered Financial Dashboard

A full-stack financial dashboard built for startups — combines AI, Machine Learning, and data visualization to help founders and their teams track finances intelligently.

## 🚀 Features

### 📊 Dashboard
- Real-time financial overview — total income, expenses, net balance, runway
- Expense breakdown bar chart
- AI-powered insights & anomaly detection

### 💸 Transactions
- Upload bank statements (CSV) — AI auto-categorizes every transaction
- Manually add income & expenses
- Full transaction table with delete support

### 📄 Reports
- Income vs Expense doughnut chart
- Net profit/loss summary

### 📈 Expense Forecasting (ML)
- Linear Regression model predicts next 3 months of expenses
- Actual vs Predicted line chart
- Model accuracy (R² score) displayed
- Trend analysis — increasing or decreasing expenses

### 🤖 AI Chat Assistant
- Ask anything about your finances in plain English
- Context-aware — knows your actual transaction data
- Powered by LLaMA 3.3 via Groq API

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Data Visualization | Chart.js |
| AI Categorization & Chat | Groq API (LLaMA 3.3 70B) |
| ML Forecasting | Python, Flask, scikit-learn, NumPy |
| Version Control | Git & GitHub |

## ⚙️ Setup & Installation

### Frontend
1. Clone the repo
```bash
   git clone https://github.com/CoderxHarsh/StartupLens.git
```
2. Create a `config.js` file in root folder
```javascript
   const API_KEY = 'your_groq_api_key_here';
```
3. Open `index.html` with Live Server

### Backend (ML Server)
1. Create conda environment
```bash
   conda create -n startuplens python=3.10
   conda activate startuplens
```
2. Install dependencies
```bash
   pip install flask flask-cors scikit-learn numpy
```
3. Start Flask server
```bash
   python app.py
```
   Server runs on `http://127.0.0.1:5000`

## 📂 CSV Format
Bank statement CSV must have these columns:
```
Date, Description, Debit, Credit, Balance
```

## 🔑 API Keys Required
- **Groq API Key** — free at https://console.groq.com

## 📁 Project Structure
```
startuplens/
├── index.html      # Main frontend
├── style.css       # Styling
├── script.js       # Frontend logic + AI integration
├── app.py          # Flask ML backend
├── config.js       # API key (not tracked by git)
├── sample.csv      # Sample bank statement
└── README.md
```