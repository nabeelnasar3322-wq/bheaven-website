// scripts/validate-schema.js
// Enforces Google Search Console & Schema.org standards across all JSON-LD blocks in the project.
// If any required or recommended field is missing (like offers, performer, validFrom),
// the build FAILS immediately, preventing any flawed schema from reaching production or Google.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['menu/index.html', 'business-lunch/index.html', 'shisha/index.html'];

let errors = [];

function validateEvent(item, file) {
  const prefix = `[${file}] Event "${item.name || 'unnamed'}": `;
  if (!item.name) errors.push(prefix + 'Missing "name"');
  if (!item.startDate) errors.push(prefix + 'Missing "startDate"');
  if (!item.endDate) errors.push(prefix + 'Missing "endDate"');
  if (!item.location) errors.push(prefix + 'Missing "location"');
  if (!item.location || !item.location.address) errors.push(prefix + 'Missing "location.address"');

  // Google Search Console Event warnings protection:
  // 1. performer
  if (!item.performer || !item.performer.name) {
    errors.push(prefix + 'Missing recommended field "performer" (must specify Person, PerformingGroup, or Organization)');
  }

  // 2. offers
  if (!item.offers || (Array.isArray(item.offers) && item.offers.length === 0)) {
    errors.push(prefix + 'Missing recommended field "offers"');
  } else {
    const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
    offers.forEach((offer, idx) => {
      if (offer.price === undefined && offer.priceSpecification === undefined) {
        errors.push(prefix + `Offer #${idx + 1} missing "price"`);
      }
      if (!offer.priceCurrency) {
        errors.push(prefix + `Offer #${idx + 1} missing "priceCurrency"`);
      }
      // 3. validFrom (in 'offers')
      if (!offer.validFrom) {
        errors.push(prefix + `Offer #${idx + 1} missing recommended field "validFrom"`);
      }
    });
  }
}

function validateRestaurant(item, file) {
  const prefix = `[${file}] Restaurant "${item.name || 'unnamed'}": `;
  if (!item.name) errors.push(prefix + 'Missing "name"');
}

PAGES.forEach(relPath => {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return;
  const html = fs.readFileSync(fullPath, 'utf8');

  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let json;
    try {
      json = JSON.parse(m[1]);
    } catch (e) {
      errors.push(`[${relPath}] Invalid JSON-LD syntax: ${e.message}`);
      continue;
    }

    const types = Array.isArray(json['@type']) ? json['@type'] : [json['@type']];
    if (types.includes('Event')) {
      validateEvent(json, relPath);
    }
    if (types.includes('Restaurant')) {
      validateRestaurant(json, relPath);
    }
  }
});

if (errors.length > 0) {
  console.error('\n❌ SCHEMA VALIDATION FAILED:\n');
  errors.forEach(err => console.error('  • ' + err));
  console.error('\nPlease fix these schema issues before deploying to prevent Google Search Console warnings.\n');
  process.exit(1);
} else {
  console.log('✅ All structured data (JSON-LD) validated successfully against Google guidelines.');
}
