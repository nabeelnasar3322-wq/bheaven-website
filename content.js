/* =====================================================================
   B·Heaven website content. Edit this file to update the site.
   Photos live in the GitHub folder: github.com/nabeelnasar3322-wq/bheaven-website
   ===================================================================== */
const IMG = '/';

/* HERO SLIDES: photos rotate in this order. "focus" is the part of the photo kept
   in view on phones (left-right %, top-bottom %). Add or remove lines to change slides. */
const HERO_SLIDES = [
  { src: IMG + 'hero-1.jpeg', focus: '64% 50%' },
  { src: IMG + 'hero-2.jpeg', focus: '55% 50%' },
  { src: IMG + 'hero-3.jpeg', focus: '50% 50%' },
  { src: IMG + 'hero-4.jpeg', focus: '45% 50%' }
];

const SITE = {
  phone: '+971 50 612 9150',
  whatsapp: '971506129150',
  email: 'aljaddaf.bheaven@barcelo.com',
  logo: '',
  /* Every photo slot looks for a file with this name in the GitHub folder.
     Upload a file with the same name and it shows up on the site. */
  photos: {
    rooftop: IMG + 'BHVNterrace-1.webp', pool: IMG + 'dome-night.webp', lounge: IMG + 'restaurant-lounge.webp',
    terrace: IMG + 'terrace-lounge.webp', bar: IMG + 'bar-counter.webp',
    day: IMG + 'pool-day.webp', sunset: IMG + 'barcelofacade.webp', night: IMG + 'dome-night.webp',
    band1: IMG + 'barcelofacade.webp', band2: IMG + 'saxophonist.webp', pass: IMG + 'pool-pass.jpg',
    resbg: IMG + 'hero-3.jpeg', visit: IMG + 'barcelofacade.webp'
  },
  /* Used until the photo above is uploaded */
  fallbacks: {
    rooftop: IMG + 'hero-1.jpeg', pool: IMG + 'hero-3.jpeg', lounge: IMG + 'hero-4.jpeg', terrace: IMG + 'hero-2.jpeg',
    day: IMG + 'hero-1.jpeg', sunset: IMG + 'hero-2.jpeg', night: IMG + 'hero-3.jpeg',
    band1: IMG + 'hero-2.jpeg', band2: IMG + 'hero-3.jpeg'
  },
  gallery: [
    { src: IMG + 'dome-night.webp', label: 'B·Heaven Dome Pavilion at night', size: 'tall' },
    { src: IMG + 'cocktails.webp', label: 'Signature cocktails' },
    { src: IMG + 'BusinesL.webp', label: 'Modern Levant cuisine' },
    { src: IMG + 'BHVNevents5.webp', label: 'Premium shisha', size: 'tall' },
    { src: IMG + 'pool-day.webp', label: 'Rooftop pool & skyline', size: 'wide' },
    { src: IMG + 'restaurant-lounge.webp', label: 'Indoor dining lounge' },
    { src: IMG + 'hero-2.jpeg', label: 'Sunset on the rooftop' },
    { src: IMG + 'terrace-lounge.webp', label: 'Terrace lounge', size: 'wide' },
    { src: IMG + 'BHVNevents4.webp', label: 'Live saxophone & music', size: 'tall' },
    { src: IMG + 'bar-counter.webp', label: 'The bar', size: 'tall' },
    { src: IMG + 'Drinks.webp', label: 'Bar & mixology', size: 'wide' },
    { src: IMG + 'barcelofacade.webp', label: 'Barceló Al Jaddaf Sunset', size: 'wide' }
  ]
};

/* "Made for sharing" photo tiles (menu tab opens when tapped) */
const TASTE = [
  { src: IMG + 'BusinesL.webp', title: 'Modern Levant plates', text: 'Mezze, grills and sharing platters, all day.', tab: 'food' },
  { src: IMG + 'cocktails.webp', title: 'Signature cocktails', text: 'House creations shaken with a view.', tab: 'drinks' },
  { src: IMG + 'BHVNevents5.webp', title: 'Premium shisha', text: 'Classic and signature flavours until late.', tab: 'shisha' },
  { src: IMG + 'pool-day.webp', title: 'Pool menu', text: 'Light bites and fresh juices by the water.', tab: 'pool' }
];

/* Kept in sync with the live site's events (bheavendubai.com/menu/ JSON-LD, #ldEv1-4).
   weekday: 0=Sun..6=Sat, startHour: 24h clock (Asia/Dubai) — used by the "Tonight's Table" strip
   in main.js to find the next event; everything else (cards, carousel) only reads the fields above. */
const EVENTS = [
  { key: 'happy', day: 'Daily', time: 'Sunset – 8 PM', weekday: 0, startHour: 17, title: 'Sunset Happy Hours', big: 'Sunset', sub: 'Happy Hours · Daily', poster: '/menu/img/ev-happy-hours.webp',
    perks: ['Sunset prices on spirits, cocktails, wine and beer', 'As the skyline turns gold'],
    price: 'Drinks from AED 35', cta: 'Book Happy Hour' },
  { key: 'grape', day: 'Every Thursday', time: '8 PM – Midnight', weekday: 4, startHour: 20, title: 'Grape & Graze', big: 'Grape', sub: '& Graze', poster: '/menu/img/ev-mezze-wine.webp',
    perks: ['A cheese board', 'Levantine mezze selections', 'Two glasses of wine (white, rosé or red)'],
    price: 'AED 99 per person' },
  { key: 'jazz', day: 'Every Friday', time: '9 PM – Midnight', weekday: 5, startHour: 21, title: 'Jazz Friday', big: 'JAZZ', sub: 'Live singing · Anetta', poster: '/menu/img/ev-jazz-night.webp',
    perks: ['Live jazz with Anetta on the rooftop', 'As the city lights come on'],
    price: 'Ladies AED 99 · Gentlemen AED 149' },
  { key: 'layali', day: 'Every Saturday', time: '9 PM – 1 AM', weekday: 6, startHour: 21, title: 'Layali Night', big: 'layali', sub: 'Night · Nouha Issa', poster: '/menu/img/ev-layali-night.webp',
    perks: ['Classic Arabic songs with Nouha Issa', 'Shisha and late-night plates', 'Reservation required'],
    price: 'Free entry · à la carte dining & shisha' },
  { key: 'ibiza', day: 'Every Sunday', time: '1 PM – 5 PM', weekday: 0, startHour: 13, title: 'Ibiza Brunch', big: 'IBIZA', sub: 'Brunch', poster: '/menu/img/ev-ibiza-brunch.webp',
    perks: ['Unlimited food and drinks', 'Live BBQ', 'Pool entry', 'DJ music'],
    price: 'Soft package from AED 149', cta: 'Book the brunch' }
];

/* Daily offers (shown under the weekly nights) */
const OFFERS = [
  { key: 'lunch', day: 'Monday – Friday', time: '12:30 PM – 3:30 PM', title: 'Business Lunch', big: 'Business', sub: 'Lunch', poster: IMG + 'BusinesL.webp',
    perks: ['2-course set menu: AED 89', '3-course set menu: AED 105'],
    price: 'From AED 89', cta: 'Book lunch' },
  { key: 'shisha', day: 'Every day', time: '8 PM – 11 PM', title: 'Shisha & Drinks', big: 'SHISHA', sub: '& Drinks', poster: IMG + 'BHVNevents5.webp',
    perks: ['1 shisha + 1 drink', 'Alcoholic or non-alcoholic'],
    price: 'AED 89', cta: 'Book shisha' }
];

/* Festive season 2026. Shown first in the What's on carousel and removed automatically after each night ends
   (times are Asia/Dubai, UTC+4). To change a price or time, edit it here. */
const FESTIVE = [
  { key: 'xmas', day: '24 December', time: '6:30 PM – 10:30 PM', until: '2026-12-24T22:30:00+04:00', title: 'Christmas Eve Dinner', big: 'Christmas', sub: 'Eve Dinner',
    perks: ['B·Heaven Pool Area', 'AED 175 per person · Soft beverages', 'AED 250 per person · House beverages', 'AED 350 per person · Premium beverages'],
    price: 'From AED 175 per person', cta: 'Book Christmas Eve' },
  { key: 'festive', day: '24 & 31 December', time: 'Two festive nights', until: '2027-01-01T04:00:00+04:00', title: 'Festive Season', big: 'Festive', sub: 'Season · 2027',
    perks: ['Christmas Eve Dinner · 24 Dec', "New Year's Eve · 31 Dec", 'B·Heaven Pool Area'],
    price: 'From AED 175 per person', cta: 'Book festive season' },
  { key: 'nye', day: '31 December', time: 'From 8 PM', until: '2027-01-01T04:00:00+04:00', title: "New Year's Eve Celebration", big: 'NYE', sub: 'Celebration · 2027',
    perks: ['B·Heaven Pool Area', 'AED 399 per person · Soft beverages', 'AED 499 per person · House beverages', 'AED 599 per person · Premium beverages'],
    price: 'From AED 399 per person', cta: 'Book New Year\'s Eve' }
];

/* GUEST REVIEWS: kept in sync with the real Google reviews already published on the live
   site (bheavendubai.com/menu/ — 4.8 stars, 309 reviews). */
const GOOGLE_RATING = { value: '4.8', count: '309' };
const REVIEWS = [
  { name: 'Sam Khanjar', source: 'Google', rating: 5, text: 'A fantastic experience — the food was delicious, fresh and beautifully presented. Definitely a five-star experience.' },
  { name: 'Destiny bySasha', source: 'Google', rating: 5, text: 'The atmosphere is amazing, made even more special by the live singer — a perfect combination of great food, ambiance and live entertainment.' },
  { name: 'So Ogun', source: 'Google', rating: 5, text: 'A fantastic evening — unique atmosphere, beautiful interiors, great energy, and live music that takes the whole experience to another level.' }
];
/* Same Google Maps link the live site uses (bheavendubai.com/menu/ JSON-LD "hasMap") — a
   direct pin, not a text search, so it always resolves to the right place. */
const REVIEW_LINK = 'https://g.page/r/CW7gQlJ3WG5wEBM/review';

