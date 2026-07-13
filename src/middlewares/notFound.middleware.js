import ApiError from '../utils/apiError.js';

const notFoundMiddleware = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFoundMiddleware;
