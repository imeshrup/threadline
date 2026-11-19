const router = require('express').Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');
const slugify = require('../utils/slugify');
const { protect, admin } = require('../middleware/auth');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toList = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1, numReviews: -1 },
  popular: { numReviews: -1, rating: -1 },
};

// GET /api/products?q=&category=&gender=&size=&color=&minPrice=&maxPrice=&sort=&page=&limit=&featured=&sale=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, minPrice, maxPrice, sort = 'newest', featured, sale } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const filter = {};

    if (q) {
      const rx = new RegExp(escapeRegex(String(q).slice(0, 100)), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { tags: rx }, { brand: rx }, { category: rx }];
    }
    const categories = toList(req.query.category);
    if (categories.length) filter.category = { $in: categories };
    const genders = toList(req.query.gender);
    if (genders.length) filter.gender = { $in: [...genders, 'unisex'] };
    const sizes = toList(req.query.size);
    const colors = toList(req.query.color);
    if (sizes.length || colors.length) {
      const match = { stock: { $gt: 0 } };
      if (sizes.length) match.size = { $in: sizes };
      if (colors.length) match.color = { $in: colors };
      filter.variants = { $elemMatch: match };
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (featured === 'true') filter.featured = true;
    if (sale === 'true') filter.$expr = { $gt: ['$compareAtPrice', '$price'] };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('-reviews')
        .sort(SORTS[sort] || SORTS.newest)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);
    res.json({ products, page, pages: Math.ceil(total / limit) || 1, total });
  })
);

// Facets for the filter sidebar
router.get(
  '/filters',
  asyncHandler(async (req, res) => {
    const [categories, sizes, colors, price] = await Promise.all([
      Product.distinct('category'),
      Product.distinct('sizes'),
      Product.aggregate([{ $unwind: '$colors' }, { $group: { _id: '$colors.name', hex: { $first: '$colors.hex' } } }, { $sort: { _id: 1 } }]),
      Product.aggregate([{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }]),
    ]);
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
    sizes.sort((a, b) => {
      const ia = sizeOrder.indexOf(a);
      const ib = sizeOrder.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return parseFloat(a) - parseFloat(b);
    });
    res.json({
      categories,
      sizes,
      colors: colors.map((c) => ({ name: c._id, hex: c.hex })),
      price: price[0] ? { min: price[0].min, max: price[0].max } : { min: 0, max: 0 },
    });
  })
);

// GET by id or slug
router.get(
  '/:idOrSlug',
  asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;
    const query = /^[a-f\d]{24}$/i.test(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
    const product = await Product.findOne(query);
    if (!product) throw new HttpError(404, 'Product not found');
    const related = await Product.find({ category: product.category, _id: { $ne: product._id } })
      .select('-reviews')
      .limit(4);
    res.json({ product, related });
  })
);

router.post(
  '/:id/reviews',
  protect,
  asyncHandler(async (req, res) => {
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Rating must be between 1 and 5');
    if (!comment) throw new HttpError(400, 'Please write a comment');
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    if (product.reviews.some((r) => r.user.equals(req.user._id)))
      throw new HttpError(409, 'You have already reviewed this product');
    const purchased = await Order.exists({
      user: req.user._id,
      'items.product': product._id,
      status: { $in: ['paid', 'shipped', 'delivered'] },
    });
    product.reviews.push({ user: req.user._id, name: req.user.name, rating, comment, verified: !!purchased });
    product.recalcRating();
    await product.save();
    res.status(201).json(product);
  })
);

router.delete(
  '/:id/reviews/:reviewId',
  protect,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    const review = product.reviews.id(req.params.reviewId);
    if (!review) throw new HttpError(404, 'Review not found');
    if (!review.user.equals(req.user._id) && !req.user.isAdmin) throw new HttpError(403, 'Not allowed');
    review.deleteOne();
    product.recalcRating();
    await product.save();
    res.json(product);
  })
);

// ---------- Admin ----------
const pickProductFields = (body) => {
  const fields = ['name', 'description', 'brand', 'category', 'gender', 'price', 'compareAtPrice', 'images', 'colors', 'sizes', 'variants', 'tags', 'featured'];
  const data = {};
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];
  if (data.compareAtPrice === '' || data.compareAtPrice === null) data.compareAtPrice = undefined;
  return data;
};

const uniqueSlug = async (name, excludeId) => {
  const base = slugify(name) || 'product';
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug, _id: { $ne: excludeId } })) slug = `${base}-${++n}`;
  return slug;
};

router.post(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const data = pickProductFields(req.body);
    if (!data.name) throw new HttpError(400, 'Name is required');
    data.slug = await uniqueSlug(data.name);
    const product = await Product.create(data);
    res.status(201).json(product);
  })
);

router.put(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    const data = pickProductFields(req.body);
    if (data.name && data.name !== product.name) data.slug = await uniqueSlug(data.name, product._id);
    product.set(data);
    await product.save();
    res.json(product);
  })
);

router.delete(
  '/:id',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new HttpError(404, 'Product not found');
    res.json({ message: 'Product deleted' });
  })
);

module.exports = router;
