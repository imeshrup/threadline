const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
delete process.env.STRIPE_SECRET_KEY;

const app = require('../src/app');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const { buildProduct } = require('../src/data/seed');
const catalog = require('../src/data/catalog');

let mongo;
let adminToken;
let userToken;
let product;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Product.insertMany(catalog.map(buildProduct));
  await User.create({ name: 'Admin', email: 'admin@t.test', password: 'admin123', isAdmin: true });
  adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@t.test', password: 'admin123' })).body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('register, login, me', async () => {
  const reg = await request(app).post('/api/auth/register').send({ name: 'Jo', email: 'jo@t.test', password: 'secret1' });
  assert.equal(reg.status, 201);
  assert.ok(reg.body.token);
  assert.equal(reg.body.user.password, undefined);
  const dup = await request(app).post('/api/auth/register').send({ name: 'Jo', email: 'JO@t.test', password: 'secret1' });
  assert.equal(dup.status, 409);
  const bad = await request(app).post('/api/auth/login').send({ email: 'jo@t.test', password: 'nope' });
  assert.equal(bad.status, 401);
  userToken = reg.body.token;
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${userToken}`);
  assert.equal(me.body.email, 'jo@t.test');
});

test('product listing, search, filters, detail', async () => {
  const all = await request(app).get('/api/products?limit=48');
  assert.equal(all.body.total, catalog.length);
  const search = await request(app).get('/api/products?q=hood');
  assert.ok(search.body.products.length >= 2);
  assert.ok(search.body.products.every((p) => /hood/i.test(p.name + p.description + p.tags)));
  const shoes = await request(app).get('/api/products?category=shoes&sort=price-asc');
  assert.ok(shoes.body.products.every((p) => p.category === 'shoes'));
  const prices = shoes.body.products.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  const priced = await request(app).get('/api/products?minPrice=100&maxPrice=150');
  assert.ok(priced.body.products.every((p) => p.price >= 100 && p.price <= 150));
  const sale = await request(app).get('/api/products?sale=true&limit=48');
  assert.ok(sale.body.products.length > 0 && sale.body.products.every((p) => p.compareAtPrice > p.price));
  const facets = await request(app).get('/api/products/filters');
  assert.ok(facets.body.sizes.indexOf('XS') < facets.body.sizes.indexOf('XL'));
  const detail = await request(app).get('/api/products/everyday-organic-tee');
  assert.equal(detail.body.product.name, 'Everyday Organic Tee');
  assert.ok(detail.body.related.length > 0);
  product = detail.body.product;
});

test('non-admin cannot create products', async () => {
  const res = await request(app).post('/api/products').set('Authorization', `Bearer ${userToken}`).send({ name: 'X' });
  assert.equal(res.status, 403);
});

test('order flow: stock reserved, server-side pricing, simulated payment, review verified', async () => {
  const variant = product.variants.find((v) => v.stock >= 2);
  const before = variant.stock;
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      items: [{ product: product._id, size: variant.size, color: variant.color, qty: 2, price: 0.01 }],
      shippingAddress: { fullName: 'Jo', line1: '1 St', city: 'X', postalCode: '1', country: 'US' },
    });
  assert.equal(res.status, 201, res.body.message);
  assert.equal(res.body.itemsPrice, product.price * 2);
  assert.equal(res.body.shippingPrice, 6.95);
  const after = await Product.findById(product._id);
  assert.equal(after.variantStock(variant.size, variant.color), before - 2);

  const tooMany = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ product: product._id, size: variant.size, color: variant.color, qty: 20 }], shippingAddress: { fullName: 'Jo', line1: '1 St', city: 'X', postalCode: '1', country: 'US' } });
  assert.equal(tooMany.status, 409);

  const pay = await request(app).post(`/api/orders/${res.body._id}/pay`).set('Authorization', `Bearer ${userToken}`);
  assert.equal(pay.body.simulated, true);
  assert.equal(pay.body.order.status, 'paid');
  const again = await request(app).post(`/api/orders/${res.body._id}/pay`).set('Authorization', `Bearer ${userToken}`);
  assert.equal(again.status, 400);

  const ship = await request(app).put(`/api/orders/${res.body._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'shipped', trackingNumber: 'TRK1' });
  assert.equal(ship.body.status, 'shipped');

  const review = await request(app).post(`/api/products/${product._id}/reviews`).set('Authorization', `Bearer ${userToken}`).send({ rating: 4, comment: 'Nice' });
  assert.equal(review.status, 201);
  assert.equal(review.body.reviews[0].verified, true);
  assert.equal(review.body.rating, 4);
  const dupReview = await request(app).post(`/api/products/${product._id}/reviews`).set('Authorization', `Bearer ${userToken}`).send({ rating: 5, comment: 'Again' });
  assert.equal(dupReview.status, 409);

  const mine = await request(app).get('/api/orders/mine').set('Authorization', `Bearer ${userToken}`);
  assert.equal(mine.body.length, 1);
});

test('cancelling a pending order restores stock', async () => {
  const p = await Product.findOne({ slug: 'merino-beanie' });
  const v = p.variants.find((x) => x.stock > 0);
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({ items: [{ product: p._id, size: v.size, color: v.color, qty: 1 }], shippingAddress: { fullName: 'Jo', line1: '1 St', city: 'X', postalCode: '1', country: 'US' } });
  const cancel = await request(app).post(`/api/orders/${res.body._id}/cancel`).set('Authorization', `Bearer ${userToken}`);
  assert.equal(cancel.body.status, 'cancelled');
  const p2 = await Product.findById(p._id);
  assert.equal(p2.variantStock(v.size, v.color), v.stock);
});

test('admin: product CRUD, stats, users', async () => {
  const auth = { Authorization: `Bearer ${adminToken}` };
  const created = await request(app).post('/api/products').set(auth).send({
    name: 'Test Polo', description: 'A polo', category: 'tops', price: 40, sizes: ['M'], colors: [{ name: 'Black', hex: '000000' }], variants: [{ size: 'M', color: 'Black', stock: 5 }],
  });
  assert.equal(created.status, 201, created.body.message);
  assert.equal(created.body.slug, 'test-polo');
  const updated = await request(app).put(`/api/products/${created.body._id}`).set(auth).send({ price: 45 });
  assert.equal(updated.body.price, 45);
  const del = await request(app).delete(`/api/products/${created.body._id}`).set(auth);
  assert.equal(del.status, 200);
  const stats = await request(app).get('/api/admin/stats').set(auth);
  assert.equal(stats.body.series.length, 30);
  assert.ok(stats.body.revenue > 0);
  const users = await request(app).get('/api/users').set(auth);
  assert.equal(users.body.length, 2);
});

test('wishlist and garment images', async () => {
  const auth = { Authorization: `Bearer ${userToken}` };
  await request(app).post(`/api/users/wishlist/${product._id}`).set(auth);
  const wl = await request(app).get('/api/users/wishlist').set(auth);
  assert.equal(wl.body[0].name, product.name);
  const img = await request(app).get('/img/garment/hoodie/2f3e46.svg');
  assert.equal(img.status, 200);
  assert.match(img.headers['content-type'], /svg/);
});
