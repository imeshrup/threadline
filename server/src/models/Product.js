const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One stock entry per size/color combination.
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true },
    color: { type: String, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    brand: { type: String, default: 'Threadline' },
    category: {
      type: String,
      required: true,
      enum: ['tops', 'bottoms', 'outerwear', 'dresses', 'shoes', 'accessories'],
    },
    gender: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    images: [{ type: String }],
    colors: [{ name: String, hex: String }],
    sizes: [{ type: String }],
    variants: [variantSchema],
    tags: [{ type: String }],
    featured: { type: Boolean, default: false },
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual('totalStock').get(function totalStock() {
  return (this.variants || []).reduce((sum, v) => sum + v.stock, 0);
});

productSchema.methods.recalcRating = function recalcRating() {
  this.numReviews = this.reviews.length;
  this.rating = this.numReviews
    ? Math.round((this.reviews.reduce((s, r) => s + r.rating, 0) / this.numReviews) * 10) / 10
    : 0;
};

productSchema.methods.variantStock = function variantStock(size, color) {
  const v = this.variants.find((x) => x.size === size && x.color === color);
  return v ? v.stock : 0;
};

productSchema.index({ name: 'text', description: 'text', tags: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
