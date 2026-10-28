module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_SERVER_ERROR";
  let message = err.message || "An unexpected error occurred";

  if (err.name === "CastError") {
    statusCode = 400;
    code = "INVALID_ID";
    message = "A supplied identifier is invalid";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
    message = "The supplied data failed validation";
  } else if (err.code === 11000) {
    statusCode = 409;
    code = "DUPLICATE_REFERENCE";
    message = "referenceId has already been used";
  }

  const payload = { success: false, error: { code, message } };
  if (err.details) payload.error.details = err.details;
  if (process.env.NODE_ENV !== "production" && statusCode === 500) {
    payload.error.debug = err.message;
  }
  res.status(statusCode).json(payload);
};
