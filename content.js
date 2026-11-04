/* =====================================================================
   B·Heaven website content. Edit this file to update the site.
   Photos live in the GitHub folder: github.com/nabeelnasar3322-wq/bheaven-website
   ===================================================================== */
const IMG = 'https://cdn.jsdelivr.net/gh/nabeelnasar3322-wq/bheaven-website@main/';

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
    rooftop: IMG + 'DAY.jpg', pool: IMG + 'Artboard%201.jpg', lounge: IMG + 'BHVNterrace-4.webp',
    terrace: IMG + 'BHVNterrace-7.webp', bar: IMG + 'Drinks.jpg',
    day: IMG + 'Artboard%201.jpg', sunset: IMG + 'Artboard%203.png', night: IMG + 'Artboard%202.png',
    band1: IMG + 'barcelofacade.webp', band2: IMG + 'hero-2.jpeg', pass: IMG + 'pool-pass.jpg',
    resbg: IMG + 'hero-3.jpeg', visit: IMG + 'barcelofacade.webp'
  },
  /* Used until the photo above is uploaded */
  fallbacks: {
    rooftop: IMG + 'hero-1.jpeg', pool: IMG + 'hero-3.jpeg', lounge: IMG + 'hero-4.jpeg', terrace: IMG + 'hero-2.jpeg',
    day: IMG + 'hero-1.jpeg', sunset: IMG + 'hero-2.jpeg', night: IMG + 'hero-3.jpeg',
    band1: IMG + 'hero-2.jpeg', band2: IMG + 'hero-3.jpeg'
  },
  gallery: [
    { src: IMG + 'Artboard%202.png', label: 'Skyline at night', size: 'tall' },
    { src: IMG + 'Artboard%203.png', label: 'Signature cocktails' },
    { src: IMG + 'BusinesL.webp', label: 'Lunch with friends' },
    { src: IMG + 'shisha.JPG', label: 'Premium shisha', size: 'tall' },
    { src: IMG + 'DAY.jpg', label: 'Poolside days', size: 'wide' },
    { src: IMG + 'BHVNterrace-6.webp', label: 'Welcome to B·Heaven' },
    { src: IMG + 'hero-2.jpeg', label: 'Sunset on the rooftop' },
    { src: IMG + 'BHVNterrace-7.webp', label: 'Terrace lounge', size: 'wide' },
    { src: IMG + 'Artboard%201.jpg', label: 'Friends by the pool', size: 'tall' },
    { src: IMG + 'BHVNterrace-4.webp', label: 'The bar', size: 'tall' },
    { src: IMG + 'Drinks.jpg', label: 'Bar & mixology', size: 'wide' },
    { src: IMG + 'hero-3.jpeg', label: 'Night views', size: 'wide' }
  ]
};

/* "Made for sharing" photo tiles (menu tab opens when tapped) */
const TASTE = [
  { src: IMG + 'BusinesL.webp', title: 'Modern Levant plates', text: 'Mezze, grills and sharing platters, all day.', tab: 'food' },
  { src: IMG + 'Artboard%203.png', title: 'Signature cocktails', text: 'House creations shaken with a view.', tab: 'drinks' },
  { src: IMG + 'shisha.JPG', title: 'Premium shisha', text: 'Classic and signature flavours until late.', tab: 'shisha' },
  { src: IMG + 'hero-1.jpeg', title: 'Pool menu', text: 'Light bites and fresh juices by the water.', tab: 'pool' }
];

/* Kept in sync with the live site's events (bheavendubai.com/menu/ JSON-LD, #ldEv1-4).
   weekday: 0=Sun..6=Sat, startHour: 24h clock (Asia/Dubai) — used by the "Tonight's Table" strip
   in main.js to find the next event; everything else (cards, carousel) only reads the fields above. */
const EVENTS = [
  { key: 'grape', day: 'Every Thursday', time: '8 PM – Midnight', weekday: 4, startHour: 20, title: 'Grape & Graze', big: 'Grape', sub: '& Graze', poster: IMG + 'BHVNevents3.PNG',
    perks: ['A cheese board', 'Levantine mezze selections', 'Two glasses of wine (white, rosé or red)'],
    price: 'AED 99 per person' },
  { key: 'jazz', day: 'Every Friday', time: '9 PM – Midnight', weekday: 5, startHour: 21, title: 'Jazz Friday', big: 'JAZZ', sub: 'Live singing · Anetta', poster: IMG + 'BHVNevents4.jpeg',
    perks: ['Live jazz with Anetta on the rooftop', 'As the city lights come on'],
    price: 'Ladies AED 99 · Gentlemen AED 149' },
  { key: 'layali', day: 'Every Saturday', time: '9 PM – 1 AM', weekday: 6, startHour: 21, title: 'Layali Night', big: 'layali', sub: 'Night · Nouha Issa', poster: IMG + 'BHVNevents2.PNG',
    perks: ['Classic Arabic songs with Nouha Issa', 'Shisha and late-night plates', 'Reservation required'],
    price: 'Free entry · à la carte dining & shisha' },
  { key: 'ibiza', day: 'Every Sunday', time: '1 PM – 5 PM', weekday: 0, startHour: 13, title: 'Ibiza Brunch', big: 'IBIZA', sub: 'Brunch', poster: IMG + 'BHVNevents1.webp',
    perks: ['Unlimited food and drinks', 'Live BBQ', 'Pool entry', 'DJ music'],
    price: 'Soft package from AED 149', cta: 'Book the brunch' }
];

/* Daily offers (shown under the weekly nights) */
const OFFERS = [
  { key: 'lunch', day: 'Monday – Friday', time: '12:30 PM – 3:30 PM', title: 'Business Lunch', big: 'Business', sub: 'Lunch', poster: IMG + 'BHVNevents1.webp',
    perks: ['2-course set menu: AED 89', '3-course set menu: AED 105'],
    price: 'From AED 89', cta: 'Book lunch' },
  { key: 'shisha', day: 'Every day', time: '8 PM – 11 PM', title: 'Shisha & Drinks', big: 'SHISHA', sub: '& Drinks', poster: IMG + 'BHVNevents5.jpeg',
    perks: ['1 shisha + 1 drink', 'Alcoholic or non-alcoholic'],
    price: 'AED 89', cta: 'Book shisha' }
];

/* GUEST REVIEWS: kept in sync with the real Google reviews already published on the live
   site (bheavendubai.com/menu/ — 4.8 stars, 279 reviews). */
const GOOGLE_RATING = { value: '4.8', count: '279' };
const REVIEWS = [
  { name: 'Sam Khanjar', source: 'Google', rating: 5, text: 'A fantastic experience — the food was delicious, fresh and beautifully presented. Definitely a five-star experience.' },
  { name: 'Destiny bySasha', source: 'Google', rating: 5, text: 'The atmosphere is amazing, made even more special by the live singer — a perfect combination of great food, ambiance and live entertainment.' },
  { name: 'So Ogun', source: 'Google', rating: 5, text: 'A fantastic evening — unique atmosphere, beautiful interiors, great energy, and live music that takes the whole experience to another level.' }
];
/* Same Google Maps link the live site uses (bheavendubai.com/menu/ JSON-LD "hasMap") — a
   direct pin, not a text search, so it always resolves to the right place. */
const REVIEW_LINK = 'https://maps.app.goo.gl/7RTPsLerNj21f1Y5A';

