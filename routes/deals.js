const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Calculate a simple score based on query word matches in the title.
function computeScore(title, query) {
  const queryWords = query.toLowerCase().split(' ').filter(Boolean);
  const titleLower = title.toLowerCase();
  let score = 0;
  queryWords.forEach((word) => {
    if (titleLower.includes(word)) {
      score += 1;
    }
  });
  return score;
}

// Find the best match by comparing computed scores from the deals.
function getBestMatch(deals, query) {
  let bestScore = -1;
  let bestDeal = null;
  deals.forEach((deal) => {
    if (deal && deal.title) {
      const score = computeScore(deal.title, query);
      if (score > bestScore) {
        bestScore = score;
        bestDeal = deal;
      }
    }
  });
  return bestDeal;
}

// Parse the price string (e.g., "₹1,096") into a numeric value.
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
}

function filterByPrice(deals, minPrice = 5000) {
  return deals.filter(deal => {
    const price = parsePrice(deal.price);
    return price >= minPrice;
  });
}

router.get('/', (req, res) => {
  const searchQuery = req.query.search || 'iphone';
  const scraperAmazon = path.join(__dirname, '../scraper.py');
  const scraperFlipkart = path.join(__dirname, '../scraper2.py');
  const scraperJiomart = path.join(__dirname, '../scraper3.py');

  const amazonProcess = spawn('python', [scraperAmazon, searchQuery], {
    cwd: process.cwd(),
  });

  amazonProcess.on('close', () => {
    const flipkartProcess = spawn('python', [scraperFlipkart, searchQuery], {
      cwd: process.cwd(),
    });

    flipkartProcess.on('close', () => {
      const jiomartProcess = spawn('python', [scraperJiomart, searchQuery], {
        cwd: process.cwd(),
      });

      jiomartProcess.on('close', () => {
        const amazonJsonPath = path.join(process.cwd(), 'deals.json');
        const flipkartJsonPath = path.join(process.cwd(), 'deals2.json');
        const jiomartJsonPath = path.join(process.cwd(), 'deals3.json');

        if (!fs.existsSync(amazonJsonPath) || !fs.existsSync(flipkartJsonPath) || !fs.existsSync(jiomartJsonPath)) {
          return res.status(500).send('One or more scraped data files not found.');
        }

        fs.readFile(amazonJsonPath, 'utf-8', (err, amazonData) => {
          if (err) return res.status(500).send('Failed to process Amazon scraped data.');

          let amazonDeals;
          try {
            amazonDeals = JSON.parse(amazonData);
          } catch {
            return res.status(500).send('Failed to parse Amazon scraped data.');
          }

          fs.readFile(flipkartJsonPath, 'utf-8', (err, flipkartData) => {
            if (err) return res.status(500).send('Failed to process Flipkart scraped data.');

            let flipkartDeals;
            try {
              flipkartDeals = JSON.parse(flipkartData);
            } catch {
              return res.status(500).send('Failed to parse Flipkart scraped data.');
            }

            fs.readFile(jiomartJsonPath, 'utf-8', (err, jiomartData) => {
              if (err) return res.status(500).send('Failed to process Jiomart scraped data.');

              let jiomartDeals;
              try {
                jiomartDeals = JSON.parse(jiomartData);
              } catch {
                return res.status(500).send('Failed to parse Jiomart scraped data.');
              }

              // Apply filter to only include deals priced at ₹5,000 or more.
              const filteredAmazonDeals = filterByPrice(amazonDeals);
              const filteredFlipkartDeals = filterByPrice(flipkartDeals);
              const filteredJiomartDeals = filterByPrice(jiomartDeals);

              // Get the best matching deal from each filtered list.
              const bestAmazonDeal = getBestMatch(filteredAmazonDeals, searchQuery);
              const bestFlipkartDeal = getBestMatch(filteredFlipkartDeals, searchQuery);
              const bestJiomartDeal = getBestMatch(filteredJiomartDeals, searchQuery);

              res.render('deals', {
                amazonDeal: bestAmazonDeal,
                flipkartDeal: bestFlipkartDeal,
                jiomartDeal: bestJiomartDeal,
                search: searchQuery,
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;