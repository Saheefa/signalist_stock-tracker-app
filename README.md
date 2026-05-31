<div align="center">

  <img src="public/assets/icons/logo.svg" alt="AlphaBeta Logo" width="180"/>

  <h1>AlphaBeta</h1>
  <h3>AI-Powered Stock Intelligence Platform</h3>

  <p>Track real-time stock prices, get ML-based price predictions, manage your watchlist, and receive AI-summarized daily news digests — all in one place.</p>

  <a href="https://signalist-stock-tracker-app-ashen.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/Live Demo-Visit App-2DFF34?style=for-the-badge&logo=vercel&logoColor=black"/>
  </a>

  <br/><br/>

  <div>
    <img src="https://img.shields.io/badge/-Next.js 16-black?style=for-the-badge&logoColor=white&logo=next.js&color=black"/>
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6"/>
    <img src="https://img.shields.io/badge/-MongoDB-black?style=for-the-badge&logoColor=white&logo=mongodb&color=00A35C"/>
    <img src="https://img.shields.io/badge/-TailwindCSS-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=38B2AC"/>
    <img src="https://img.shields.io/badge/-Inngest-black?style=for-the-badge&logoColor=white&logo=inngest&color=6366F1"/>
    <img src="https://img.shields.io/badge/-Gemini AI-black?style=for-the-badge&logoColor=white&logo=google&color=4285F4"/>
    <img src="https://img.shields.io/badge/-Vercel-black?style=for-the-badge&logoColor=white&logo=vercel&color=000000"/>
  </div>

</div>

---

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [ML Prediction Engine](#ml-prediction-engine)
5. [Quick Start](#quick-start)
6. [Environment Variables](#environment-variables)
7. [Project Structure](#project-structure)

---

## ✨ Introduction <a name="introduction"></a>

**AlphaBeta** is a full-stack AI stock intelligence platform built with Next.js 16 that democratizes institutional-grade financial tools for retail investors. It combines real-time market data, machine learning price predictions, and AI-generated news summaries into a single, intuitive interface.

**Live App:** [signalist-stock-tracker-app-ashen.vercel.app](https://signalist-stock-tracker-app-ashen.vercel.app)

---

## 🔋 Features <a name="features"></a>

**📊 Live Stock Dashboard**
Real-time market overview with an interactive line chart, sector tabs (Financial, Technology, Services), and a color-coded heatmap of 37 major S&P 500 stocks powered by Finnhub API. Click any tile to navigate directly to that stock's detail page.

**📈 ML Price Prediction**
Custom-built machine learning engine using Linear Regression, RSI (Relative Strength Index), Bollinger Bands, EMA-20, and SMA-20. Generates a 30-day price projection from 260 data points using Geometric Brownian Motion simulation. Outputs Buy / Hold / Sell signals with a confidence score.

**⭐ Smart Watchlist**
Add stocks to a personal watchlist stored in MongoDB. Dashboard shows all saved stocks with live prices and percentage changes. Add/remove with a single click from any stock detail page.

**🤖 AI Daily News Digest**
Inngest cron job fires every day at 12 PM UTC. Fetches news for each user's watchlisted stocks via Finnhub, summarizes it using Google Gemini AI, and delivers a personalized HTML email via Nodemailer.

**📧 Automated Email Alerts**
Inngest-powered event-driven emails including personalized welcome emails on sign-up, daily news digests, and price alert notifications.

**🔒 Authentication**
Secure email/password authentication via Better Auth with MongoDB session management.

**📉 Technical Analysis**
TradingView-powered technical analysis gauge (Strong Buy → Strong Sell) with multi-timeframe support (1m, 5m, 15m, 1h).

**💹 Company Financials**
Detailed financial data including P/E ratio, EPS, Market Cap, Revenue, Cash Flow, Profitability margins, and Efficiency metrics.

---

## ⚙️ Tech Stack <a name="tech-stack"></a>

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Recharts, TradingView Widgets |
| **Backend** | Next.js API Routes, Better Auth, Mongoose |
| **Database** | MongoDB Atlas |
| **AI / ML** | Google Gemini AI, Linear Regression, RSI, Bollinger Bands, GBM |
| **Background Jobs** | Inngest (event-driven + cron) |
| **Email** | Nodemailer + Gmail |
| **Data API** | Finnhub |
| **Deployment** | Vercel (CI/CD via GitHub) |

---

## 🤖 ML Prediction Engine <a name="ml-prediction-engine"></a>

The prediction engine is implemented in `lib/ml/stockPrediction.ts` and runs entirely server-side:

1. **Data Ingestion** — Fetches real current price and volatility from Finnhub's free `/quote` endpoint
2. **GBM Simulation** — Generates 260 days of realistic price history using Geometric Brownian Motion seeded from the real price
3. **Feature Engineering** — Computes SMA-20, EMA-20, RSI-14, Bollinger Bands (upper/middle/lower)
4. **Linear Regression** — Fits a trend line over historical prices and projects 30 days forward
5. **Signal Generation** — Produces Buy / Hold / Sell signal + confidence score based on RSI and Bollinger Band position

The ML component is accessible on every stock detail page at `/stocks/[symbol]`.

---

## 🤸 Quick Start <a name="quick-start"></a>

**Prerequisites**

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en) (v18+)
- [npm](https://www.npmjs.com/)

**Clone the Repository**

```bash
git clone https://github.com/Saheefa/signalist_stock-tracker-app.git
cd signalist_stock-tracker-app
```

**Install Dependencies**

```bash
npm install
```

**Set Up Environment Variables**

Create a `.env` file in the root:

```env
NODE_ENV='development'
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# FINNHUB
NEXT_PUBLIC_FINNHUB_API_KEY=
FINNHUB_BASE_URL=https://finnhub.io/api/v1

# MONGODB
MONGODB_URI=

# BETTER AUTH
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# GEMINI
GEMINI_API_KEY=

# NODEMAILER
NODEMAILER_EMAIL=
NODEMAILER_PASSWORD=

# INNGEST (optional for local dev)
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=
```

**Run the App**

```bash
# Terminal 1 — Next.js dev server
npm run dev

# Terminal 2 — Inngest local dev server (for background jobs)
npx inngest-cli@latest dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables <a name="environment-variables"></a>

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_FINNHUB_API_KEY` | Stock market data API | [finnhub.io](https://finnhub.io) — free tier |
| `MONGODB_URI` | Database connection string | [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) |
| `BETTER_AUTH_SECRET` | Auth secret key | Run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Your app's base URL | `http://localhost:3000` for local |
| `GEMINI_API_KEY` | Gemini AI for news summarization | [Google AI Studio](https://aistudio.google.com) |
| `NODEMAILER_EMAIL` | Gmail address for sending emails | Your Gmail |
| `NODEMAILER_PASSWORD` | Gmail App Password (not your real password) | [Google App Passwords](https://myaccount.google.com/apppasswords) |
| `INNGEST_SIGNING_KEY` | Inngest webhook signing key | [app.inngest.com](https://app.inngest.com) |
| `INNGEST_EVENT_KEY` | Inngest event API key | [app.inngest.com](https://app.inngest.com) |

---

## 📁 Project Structure <a name="project-structure"></a>

```
alphabeta/
├── app/
│   ├── (auth)/          # Sign-in and sign-up pages
│   ├── (root)/          # Main app (dashboard, stock detail)
│   └── api/             # API routes (watchlist, heatmap, ML prediction)
├── components/          # React components
│   ├── StockHeatmap.tsx # Custom Finnhub-powered heatmap
│   ├── StockPrediction.tsx  # ML prediction chart
│   ├── WatchlistPanel.tsx   # Dashboard watchlist
│   └── WatchlistButton.tsx  # Add/remove watchlist button
├── database/
│   └── models/          # Mongoose models
├── lib/
│   ├── actions/         # Server actions
│   ├── better-auth/     # Auth configuration
│   ├── inngest/         # Background job functions + prompts
│   ├── ml/              # ML prediction engine
│   └── nodemailer/      # Email templates + sender
└── public/
    └── assets/          # Icons, images
```

---

## 🚀 Deployment

The app is deployed on **Vercel** with automatic CI/CD:

```
GitHub push → Vercel auto-deploy → Inngest sync → Functions live
```

**Live URL:** [signalist-stock-tracker-app-ashen.vercel.app](https://signalist-stock-tracker-app-ashen.vercel.app)

---

<div align="center">
  <p>Built with ❤️ by <strong>Sahifa Hashmi</strong></p>
  <p><em>AlphaBeta — Democratizing institutional-grade stock intelligence for everyone.</em></p>
</div>
