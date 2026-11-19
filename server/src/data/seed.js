require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const slugify = require('../utils/slugify');
const { calcTotals } = require('../utils/pricing');
const catalog = require('./catalog');

// Deterministic pseudo-random so seeds are reproducible
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const REVIEW_TEXT = [
  [5, 'Absolutely love it. The fabric feels premium and the fit is spot on.'],
  [5, 'Bought a second color right away. Great quality for the price.'],
  [4, 'Really nice, runs slightly large so consider sizing down.'],
  [4, 'Comfortable and well made. Shipping was quick too.'],
  [3, 'Good overall but the color was a little different than pictured.'],
  [5, 'My new favorite piece. Washes really well.'],
];

const fs = require('fs');
const path = require('path');

// Real photos: put files in server/product-photos named <product-slug>-1.jpg, <product-slug>-2.jpg ...
// (jpg, jpeg, png or webp). They're matched to colors in order: photo 1 = first color, and so on.
const PHOTO_DIR = path.join(__dirname, '..', '..', 'product-photos');
const photosFor = (slug) => {
  let files = [];
  try { files = fs.readdirSync(PHOTO_DIR); } catch { return []; }
  const rx = new RegExp(`^${slug}-(\\d+)\\.(jpe?g|png|webp)$`, 'i');
  return files
    .map((f) => ({ f, m: f.match(rx) }))
    .filter((x) => x.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]))
    .map((x) => `/product-photos/${x.f}`);
};

function buildProduct(item) {
  const variants = [];
  for (const color of item.colors)
    for (const size of item.sizes) variants.push({ size, color: color.name, stock: Math.floor(rand() * 25) + (rand() < 0.1 ? 0 : 3) });
  const { shape, ...rest } = item;
  const slug = slugify(item.name);
  const photos = photosFor(slug);
  return {
    ...rest,
    slug,
    brand: 'Threadline',
    images: photos.length ? photos : item.colors.map((c) => `/img/garment/${shape}/${c.hex}.svg`),
    variants,
  };
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([Product.deleteMany({}), User.deleteMany({}), Order.deleteMany({})]);

  const admin = await User.create({ name: 'Store Admin', email: 'admin@threadline.test', password: 'admin123', isAdmin: true });
  const customers = await Promise.all(
    ['Ava Morgan', 'Liam Chen', 'Sofia Patel', 'Noah Williams', 'Maya Johnson'].map((name, i) =>
      User.create({
        name,
        email: i === 0 ? 'customer@threadline.test' : `${name.split(' ')[0].toLowerCase()}@example.com`,
        password: 'password123',
        address: { fullName: name, line1: `${100 + i * 7} Market Street`, city: 'Portland', postalCode: '97205', country: 'United States', phone: '555-0100' },
      })
    )
  );

  const products = await Product.insertMany(catalog.map(buildProduct));

  // Reviews
  for (const product of products) {
    const n = Math.floor(rand() * 4);
    const reviewers = [...customers].sort(() => rand() - 0.5).slice(0, n);
    for (const u of reviewers) {
      const [rating, comment] = pick(REVIEW_TEXT);
      product.reviews.push({ user: u._id, name: u.name, rating, comment, verified: true });
    }
    product.recalcRating();
    await product.save();
  }

  // Historical orders over the last 30 days for the dashboard
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'paid', 'paid', 'pending', 'cancelled'];
  for (let i = 0; i < 40; i++) {
    const user = pick(customers);
    const items = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
      const prod = pick(products);
      const v = pick(prod.variants);
      return { product: prod._id, name: prod.name, image: prod.images[0], price: prod.price, size: v.size, color: v.color, qty: 1 + Math.floor(rand() * 2) };
    });
    const status = pick(statuses);
    const createdAt = new Date(Date.now() - Math.floor(rand() * 29 * 86400000));
    const shippingMethod = rand() < 0.25 ? 'express' : 'standard';
    await Order.create({
      user: user._id,
      items,
      shippingAddress: user.address,
      shippingMethod,
      ...calcTotals(items, shippingMethod),
      status,
      payment: status === 'pending' || status === 'cancelled' ? undefined : { provider: 'simulated', paidAt: createdAt },
      shippedAt: ['shipped', 'delivered'].includes(status) ? createdAt : undefined,
      deliveredAt: status === 'delivered' ? createdAt : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  }

  console.log(`Seeded ${products.length} products, ${customers.length + 1} users, 40 orders.`);
  console.log('Admin login:    admin@threadline.test / admin123');
  console.log('Customer login: customer@threadline.test / password123');
  return { admin };
}

if (require.main === module) {
  seed()
    .then(() => mongoose.disconnect())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed, buildProduct };
