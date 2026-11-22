/**
 * Wraps an async Express handler so that any rejected promise is forwarded
 * to Express's error handling middleware instead of becoming an
 * UnhandledPromiseRejectionWarning (which can crash the process).
 *
 * @param {Function} fn Async (or sync) Express route handler.
 * @returns {Function} Express-compatible middleware.
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.then === 'function') {
        return result.catch(next);
      }
      return result;
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = asyncHandler;
