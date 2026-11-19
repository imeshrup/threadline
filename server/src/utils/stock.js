const Product = require('../models/Product');
const HttpError = require('./httpError');

// Atomically decrement stock for every line. If any line fails, roll back the ones already taken.
async function reserveStock(items) {
  const taken = [];
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const result = await Product.updateOne(
      { _id: item.product, variants: { $elemMatch: { size: item.size, color: item.color, stock: { $gte: item.qty } } } },
      { $inc: { 'variants.$.stock': -item.qty } }
    );
    if (result.modifiedCount !== 1) {
      // eslint-disable-next-line no-await-in-loop
      await releaseStock(taken);
      throw new HttpError(409, `Sorry, "${item.name}" (${item.color} / ${item.size}) doesn't have ${item.qty} in stock`);
    }
    taken.push(item);
  }
}

async function releaseStock(items) {
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await Product.updateOne(
      { _id: item.product, variants: { $elemMatch: { size: item.size, color: item.color } } },
      { $inc: { 'variants.$.stock': item.qty } }
    );
  }
}

module.exports = { reserveStock, releaseStock };
