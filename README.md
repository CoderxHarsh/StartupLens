# 💡 StartupLens — AI Financial Dashboard

An AI-powered financial dashboard built for startups to track income, expenses, and get intelligent insights.

## 🚀 Features
- 📊 Real-time financial dashboard — burn rate, runway, net balance
- 💸 Income & expense tracking with categories
- 🤖 AI-powered bank statement analyzer — upload CSV and auto-categorize transactions
- 📄 Reports with income vs expense charts
- 💬 AI chat assistant — ask questions about your finances in plain language

## 🛠️ Tech Stack
- HTML, CSS, JavaScript
- Chart.js — data visualization
- Groq API (LLaMA 3.3) — AI categorization & chat

## ⚙️ Setup
1. Clone the repo
2. Create a `config.js` file in root folder
3. Add your Groq API key:
   const API_KEY = 'your_groq_api_key_here';
4. Open `index.html` with Live Server

## 📂 CSV Format
Upload bank statement with these columns:
Date, Description, Debit, Credit, Balance
