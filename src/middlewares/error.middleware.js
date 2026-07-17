import logger from '../utils/logger.js';
import ApiError from '../utils/apiError.js';

const errorMiddleware = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target?.join(', ') || 'field';
    message = `A record with this ${target} already exists`;
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (!(err instanceof ApiError) && statusCode === 500) {
    logger.error('Unhandled error', err);
  }

  const response = {
    success: false,
    message,
  };

  if (err.details) {
    response.errors = err.details;
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorMiddleware;
