# PriceScope — Deal Aggregator

A full-stack price comparison app that scrapes live mobile-phone listings from
multiple e-commerce sites and shows the best match from each, side by side.

**Stack:** Express.js · EJS · MongoDB (Mongoose) · Python (Selenium + BeautifulSoup)

## Features

- **Multi-site scraping** — search once, get results from Amazon India, Flipkart
  and JioMart. Amazon and JioMart are scraped with headless Selenium Chrome;
  Flipkart via `requests` + BeautifulSoup with class-name fallbacks.
- **Best-match ranking** — results are filtered to ₹5,000+ listings, then scored
  by how many query words appear in the product title, and the top hit per site
  is rendered for comparison ([routes/deals.js](routes/deals.js)).
- **Accounts & sessions** — signup/login by phone number with `bcrypt`-hashed
  passwords and server-side sessions persisted in MongoDB via `connect-mongo`.
- **Server-rendered UI** — EJS views with hand-written CSS: landing page, deals
  comparison page, a featured product page, plus privacy and terms pages.

## Project layout

```
app.js            Express app: Mongo connection, session store, route mounting
routes/index.js   Landing page, static pages, Flipkart scraper test endpoint
routes/deals.js   Runs the three scrapers, filters/ranks results, renders deals
routes/auth.js    Signup, login, logout
models/User.js    User schema + password hashing and comparison
scraper.py        Amazon India  (Selenium)      -> deals.json
scraper2.py       Flipkart      (requests)      -> deals2.json
scraper3.py       JioMart       (Selenium)      -> deals3.json
views/            EJS templates
public/           CSS, client JS, images
```

## Getting started

Requirements: Node.js 18+, Python 3.9+, Google Chrome, and a MongoDB instance.

```bash
npm install
pip install selenium beautifulsoup4 requests webdriver-manager
```

Create a `.env` file:

```
MONGO_URI=mongodb://localhost:27017/pricescope
SESSION_SECRET=replace-me
PORT=3000
```

Run it:

```bash
npm run dev    # nodemon
npm start      # node app.js
```

Open http://localhost:3000 and search from the landing page, or hit
`/deals?search=iphone+15` directly.

## How the search flow works

1. `GET /deals?search=<query>` spawns the three Python scrapers in sequence.
2. Each scraper writes its results to its own JSON file in the working directory.
3. Express reads all three files, drops anything under ₹5,000, scores the
   remaining titles against the query, and renders the best result per site.

Because scrapers run in series and Selenium starts a real browser, a search
takes several seconds. Scrapers depend on the retailers' current markup, so
selectors may need updating if a site changes its layout.

## Roadmap

- Cache scraped results instead of re-running scrapers on every request
- Price-history tracking and trend prediction
- Personalized recommendations from user click data
- More retailers
