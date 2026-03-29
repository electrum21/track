# 🧠 CardSense — Singapore Credit Card Intelligence Platform

CardSense is a full-stack web application that transforms fragmented credit card data into a **centralized, decision-ready intelligence platform** for Singapore users.

Developed by a team of 3 during the **TinyFish AI Hackathon at Acacia College, NUS**, this project explores how structured data and AI can be combined to simplify financial decision-making.  
The platform is **actively being improved and expanded** beyond the hackathon prototype.

---

## ✨ Core Idea

Choosing the right credit card is difficult because information is:
- scattered across bank websites and aggregators  
- inconsistent in format  
- hard to compare meaningfully  

CardSense solves this by:
- aggregating data into a unified schema  
- enabling powerful filtering and comparison  
- layering AI on top for personalized recommendations  

---

## 🐟 Role of TinyFish

At the heart of CardSense is **TinyFish**, which acts as the **data acquisition and extraction engine**.

### How TinyFish is used:

- **Web scraping orchestration**  
  TinyFish runs structured scraping workflows across:
  - bank websites  
  - aggregator platforms (e.g. MoneySmart)  
  - merchant cashback platforms (e.g. ShopBack, Eatigo)

- **AI-powered data extraction**  
  Instead of returning raw HTML, TinyFish extracts structured fields such as:
  - card names, banks, and types  
  - cashback rates and categories  
  - signup rewards and conditions  
  - merchant cashback rates  
  - promotion metadata  

- **Asynchronous run system**  
  Each scrape is executed as a TinyFish run:
  - tracked via `run_id`  
  - returns `final_run_data` payloads  
  - supports multiple source categories  

- **Multi-source categorization**  
  Data is tagged by source type:
  - `BANK_CASHBACK`  
  - `BANK_SIGNUP`  
  - `SHOPBACK`  
  - `EATIGO`  
  - `MONEYSMART`  

- **Foundation for the data pipeline**  
  TinyFish outputs are ingested into Supabase via custom scripts, where they are:
  - normalized  
  - deduplicated  
  - structured into relational tables  

👉 TinyFish transforms messy web data into **AI-ready structured datasets**, enabling the rest of the system.

---

## 🚀 Key Functionalities

### 🏦 1. Card Explorer
Browse and compare credit cards in a structured, searchable interface.

**Capabilities:**
- Filter by:
  - Bank  
  - Card type  
  - Annual fee (**Free / Waived / Paid**)  
- Sort by cashback potential  
- View normalized cashback categories  

---

### 🎁 2. Signup Offers Aggregation
Centralizes promotional offers across banks and aggregators.

**Capabilities:**
- Filter by:
  - Bank  
  - Reward type  
  - Exclusivity  
- Sort by:
  - Highest reward value  
  - Nearest expiry  
- View:
  - reward value  
  - minimum spend  
  - spend window  
  - expiry  

---

### 🛍 3. Merchant Cashback Intelligence
Surfaces high-value cashback opportunities from merchant platforms.

**Capabilities:**
- Filter by category  
- Sort by highest cashback  
- Designed for **stacking with cards**

---

### 🤖 4. AI Advisor (Recommendation Engine)

Transforms structured data into personalized recommendations.

**How it works:**
1. User inputs preferences (natural language)  
2. Backend retrieves structured data from Supabase  
3. Data is injected into an AI prompt  
4. AI selects and explains best-fit cards  

👉 This is a **retrieval-augmented system**, grounded in real data.

---

### 🔍 5. Data Normalization Layer

Bridges TinyFish outputs with a usable product.

**Capabilities:**
- Converts heterogeneous JSON into structured tables:
  - `cashback_cards`  
  - `signup_offers`  
  - `merchant_offers`  
  - `card_promotions`  
- Handles:
  - inconsistent formats  
  - missing fields  
  - numeric extraction (e.g. cashback rates)  

---

### 🧩 6. Multi-Source Data Integration

Combines multiple ecosystems into a unified model:

- Bank-issued cards  
- Signup promotions  
- Aggregator insights  
- Merchant cashback deals  

This enables:
- cross-source comparison  
- richer card profiles  
- future stacking logic  

---

## 🧠 System Design Philosophy

CardSense is built as a **data-first, AI-assisted system**:

- **TinyFish → Data ingestion & extraction**  
- **Supabase → Structured storage**  
- **Backend → filtering + logic**  
- **AI → reasoning + explanation**  

This avoids relying purely on AI and instead combines:

> structured logic + intelligent reasoning

---

## 🚧 Current Status

Originally developed during a hackathon, CardSense is now:

- actively being refined  
- expanding data coverage  
- improving recommendation quality  
- enhancing UI/UX  

---

## 🔮 Future Directions

- Card detail pages with full breakdowns  
- Smarter recommendation engine (hybrid scoring + AI)  
- Promotion stacking logic  
- Deduplication across sources  
- Spend optimization tools  
- Real-time updates  

---

## 👥 Team

Built by a team of 3 during the  
**TinyFish AI Hackathon @ Acacia College, NUS**

---

## 💡 Motivation

This project explores how AI can move beyond chat interfaces into:
- structured decision systems  
- real-world financial applications  
- user-centric product design  

---