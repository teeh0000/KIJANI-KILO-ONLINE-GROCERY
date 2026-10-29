/* =========================================================
   KIJANI KILO | PRODUCT DATA
   Prices are in KES per kg (baskets: per basket) and are SAMPLE
   values. Change names, prices and stock here, nothing else.

   Each row:  [ name, price, stock, tag, photo, extra ]
     tag    : "" | "fresh" | "best" | "offer" | "organic" | "new"
     photo  : file name in the images folder, WITHOUT .jpg/.png
              (only used for categories with photos:true)
     extra  : for "offer" rows the old price, for baskets what is inside
              (rows with an old price AND a note are not needed)

   ADDING PHOTOS TO OTHER CATEGORIES
     1. Put the pictures in the images folder.
     2. In the category below set  photos: true
     3. Give each row its photo name, e.g. ["Carrots",90,70,"best","carrots"]
   Until then those cards show a neat leaf placeholder.
   ========================================================= */

const KK_CATEGORIES = [
  { id: 'leafy-greens',   name: 'Leafy greens',       tint: '#E6F6EE', photos: true,  unit: 'kg',     step: 0.5,  chips: [0.5, 1, 2, 5],
    blurb: 'Picked fresh and sold by the kilo.' },
  { id: 'root-vegetables', name: 'Root vegetables',   tint: '#FFF1DE', photos: true, unit: 'kg',     step: 0.5,  chips: [0.5, 1, 2, 5],
    blurb: 'Hearty roots for stews, roasts and mash.' },
  { id: 'fruit-vegetables', name: 'Fruit vegetables', tint: '#FFE8E4', photos: true, unit: 'kg',     step: 0.5,  chips: [0.5, 1, 2, 5],
    blurb: 'Tomatoes, peppers, pumpkins and beans.' },
  { id: 'herbs',          name: 'Herbs',              tint: '#EAF6D0', photos: true, unit: 'kg',     step: 0.25, chips: [0.25, 0.5, 1],
    blurb: 'A little goes a long way. Sold from a quarter kilo.' },
  { id: 'onions-garlic',  name: 'Onions & garlic',    tint: '#F1E9F7', photos: true, unit: 'kg',     step: 0.5,  chips: [0.5, 1, 2, 5],
    blurb: 'Onions, garlic, ginger and the flavour makers.' },
  { id: 'baskets',        name: 'Ready-made baskets', tint: '#F6EFD9', photos: true, unit: 'basket', step: 1,    chips: [],
    blurb: 'Shop once, cook all week. One price per basket.' }
];

const KK_ROWS = {
  'leafy-greens': [
    ['African nightshade (Managu)', 150, 40, 'fresh', 'africannightshade'],
    ['Beet greens', 120, 25, '', 'beetgreens'],
    ['Broccoli', 300, 18, 'new', 'brocolli'],
    ['Cabbage', 50, 120, 'best', 'cabbage'],
    ['Cassava leaves (Mboga ya muhogo)', 130, 30, '', 'casssava leaves'],
    ['Chinese cabbage', 90, 45, '', 'chinese cabbage'],
    ['Cowpea leaves (Kunde)', 100, 35, 'organic', 'cowpealeaves'],
    ['Cucumber', 110, 60, 'fresh', 'cucumber'],
    ['Endive', 180, 0, '', 'endive'],
    ['Jute mallow (Mrenda)', 120, 20, '', 'jute mallow'],
    ['Kale (curly)', 140, 28, 'organic', 'kales'],
    ['Lettuce', 220, 22, '', 'lettuce'],
    ['Mizuna', 200, 9, 'new', 'mizuna'],
    ['Pumpkin leaves (Seveve)', 110, 30, '', 'pumpkinleaves'],
    ['Spinach', 80, 6, 'best', 'spinach'],
    ['Sukuma wiki', 60, 150, 'best', 'sukumawiki'],
    ['Sweet potato leaves (Matembele)', 100, 26, '', 'sweetpotatoleaves'],
    ['Swiss chard', 90, 32, '', 'swiss chard'],
    ['Terere (Amaranth)', 70, 55, 'fresh', 'terere'],
    ['Turnip greens', 120, 18, 'offer', 'turnipgreens', 150]
  ],

  'root-vegetables': [
    ['Carrots', 90, 70, 'fresh', 'carrot'],
    ['Irish potatoes', 70, 300, 'best', 'irishpotatoes'],
    ['Sweet potatoes (white)', 80, 120, '', 'sweetpotatoeswhite'],
    ['Orange-fleshed sweet potatoes', 100, 60, 'organic', 'orangesweetpotatoes'],
    ['Purple sweet potatoes', 120, 35, 'new', 'purplesweetpotatoes'],
    ['Arrow roots', 150, 40, '', 'arrowroots'],
    ['Cassava', 60, 90, '', 'cassava'],
    ['Beetroot', 100, 55, 'fresh', 'beetroot1'],
    ['Turnips', 90, 40, '', 'turnips'],
    ['Radish', 120, 25, '', 'radish'],
    ['Parsnips', 250, 15, '', 'parsnips'],
    ['Yams', 200, 20, '', 'yams'],
    ['Nduma (Taro)', 140, 30, '', 'nduma'],
    ['Celeriac', 300, 8, '', 'celeriac'],
    ['Red potatoes', 90, 70, 'offer', 'redpotatoes', 110],
    ['Baby potatoes', 130, 45, 'fresh', 'babypotatoes'],
    ['Swede', 140, 18, '', 'swede'],
    ['Kohlrabi', 160, 14, '', 'kohlrabi'],
    ['Baby carrots', 180, 30, 'new', 'babycarrots'],
    ['Jerusalem artichoke', 280, 10, '', 'jerusalemartichoke']
  ],




'fruit-vegetables': [
  ['Tomatoes', 120, 80, 'best', 'tomatoes'],
  ['Cherry tomatoes', 350, 20, 'new', 'cherrytomatoes'],
  ['Plum tomatoes', 140, 50, '', 'plumtomatoes'],
  ['Green capsicum', 250, 35, '', 'greencapsicum'],
  ['Red capsicum', 320, 22, 'offer', 'redcapsicum', 380],
  ['Yellow capsicum', 330, 18, '', 'yellowcapsicum'],
  ['Chillies', 280, 12, '', 'chillies'],
  ['Eggplant', 160, 40, 'fresh', 'eggplant'],
  ['African eggplant (Ngogwe)', 180, 15, '', 'africaneggplant'],
  ['Zucchini', 170, 30, '', 'zucchini'],
  ['Butternut', 90, 60, 'organic', 'butternut'],
  ['Pumpkin', 60, 85, '', 'pumpkin'],
  ['Green beans', 200, 26, 'fresh', 'greenbeans'],
  ['French beans', 220, 24, '', 'frenchbeans'],
  ['Okra', 180, 16, '', 'okra'],
  ['Green peas', 250, 20, '', 'greenpeas'],
  ['Sweet corn', 120, 45, 'best', 'sweetcorn'],
  ['Snow peas', 300, 10, '', 'snowpeas'],
  ['Patty pan squash', 200, 12, '', 'pattypansquash'],
  ['Bitter gourd', 220, 9, '', 'bittergourd']
],




'herbs': [
  ['Coriander (Dhania)', 150, 20, 'best', 'coriander'],
  ['Parsley', 200, 12, '', 'parsley'],
  ['Mint', 180, 14, 'fresh', 'mint'],
  ['Basil', 250, 8, '', 'basil'],
  ['Rosemary', 300, 10, '', 'rosemary'],
  ['Thyme', 320, 6, '', 'thyme'],
  ['Dill', 220, 9, '', 'dill'],
  ['Chives', 260, 7, '', 'chives'],
  ['Oregano', 300, 6, '', 'oregano'],
  ['Sage', 320, 5, '', 'sage'],
  ['Lemongrass', 140, 18, 'organic', 'lemongrass'],
  ['Tarragon', 380, 0, '', 'tarragon'],
  ['Bay leaves', 350, 6, '', 'bayleaves'],
  ['Curry leaves', 200, 10, '', 'curryleaves'],
  ['Celery leaves', 160, 12, '', 'celeryleaves'],
  ['Fennel', 240, 9, '', 'fennel'],
  ['Sorrel', 200, 7, '', 'sorrel'],
  ['Marjoram', 320, 5, '', 'marjoram'],
  ['Lemon balm', 260, 6, 'new', 'lemonbalm'],
  ['Moringa leaves', 180, 15, 'organic', 'moringaleaves']
],



  
 'onions-garlic': [
  ['Red onions', 100, 200, 'best', 'redonions'],
  ['Large red onions', 130, 90, '', 'largeredonions'],
  ['White onions', 120, 80, '', 'whiteonions'],
  ['Yellow onions', 110, 70, '', 'yellowonions'],
  ['Sweet onions', 160, 35, '', 'sweetonions'],
  ['Spring onions', 150, 40, 'fresh', 'springonions'],
  ['Red spring onions', 170, 18, '', 'redspringonions'],
  ['Shallots', 220, 25, '', 'shallots'],
  ['Pearl onions', 280, 12, '', 'pearlonions'],
  ['Leeks', 200, 22, '', 'leeks'],
  ['Garlic', 400, 30, 'offer', 'garlic', 450],
  ['Peeled garlic', 650, 10, '', 'peeledgarlic'],
  ['Elephant garlic', 500, 0, '', 'elephantgarlic'],
  ['Garlic chives', 240, 9, '', 'garlicchives'],
  ['Ginger', 300, 45, 'best', 'ginger'],
  ['Young ginger', 350, 16, 'new', 'youngginger'],
  ['Turmeric root', 320, 14, '', 'turmericroot'],
  ['Galangal', 420, 8, '', 'galangal'],
  ['Onion sets', 180, 20, '', 'onionsets'],
  ['Bulk cooking onions', 85, 300, '', 'bulkcookingtonions']
],





'baskets': [
  ['Weekly Family Box', 1450, 15, 'best', 'basket1', 'Tomatoes, onions, kale, cabbage, carrots, potatoes'],
  ['Salad Pack', 650, 20, 'fresh', 'basket2', 'Lettuce, cucumber, tomatoes, capsicum, coriander'],
  ['Student Budget Box', 550, 25, 'offer', 'basket3', 'Potatoes, cabbage, onions, tomatoes, sukuma wiki'],
  ['Couple’s Box', 900, 18, '', 'basket4', 'Tomatoes, onions, spinach, carrots, capsicum'],
],
}







/* Turns the rows above into product objects (you do not need to edit this) */
const KK_PRODUCTS = [];
(() => {
  const prefix = { 'leafy-greens': 'lg', 'root-vegetables': 'rt', 'fruit-vegetables': 'fv', 'herbs': 'hb', 'onions-garlic': 'og', 'baskets': 'bk' };
  KK_CATEGORIES.forEach((cat) => {
    KK_ROWS[cat.id].forEach((r, i) => {
      const isBasket = cat.unit === 'basket';
      KK_PRODUCTS.push({
        id: `${prefix[cat.id]}-${i + 1}`,
        cat: cat.id,
        name: r[0], price: r[1], stock: r[2], tag: r[3] || '',
        img: r[4] || '',
        was: !isBasket && typeof r[5] === 'number' ? r[5] : (isBasket && r[3] === 'offer' && typeof r[6] === 'number' ? r[6] : 0),
        note: isBasket && typeof r[5] === 'string' ? r[5] : ''
      });
    });
  });
  // Student Budget Box old price (basket offers store it in a 7th slot)
  const sb = KK_PRODUCTS.find((p) => p.name === 'Student Budget Box');
  if (sb) sb.was = 620;
})();
