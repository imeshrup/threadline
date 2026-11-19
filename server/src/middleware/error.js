const notFound = (req, res) => res.status(404).json({ message: `Not found: ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'CastError') {
    status = 404;
    message = 'Resource not found';
  } else if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || {}).join(', ') || 'Value'} already exists`;
  }
  if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
