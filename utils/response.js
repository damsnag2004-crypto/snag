const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
    ...(data && { data })
  };
  
  return res.status(statusCode).json(response);
};

const errorResponse = (res, message, error = null, statusCode = 400) => {
  const response = {
    success: false,
    message,
    ...(error && { error })
  };
  
  return res.status(statusCode).json(response);
};

const paginationResponse = (res, message, data, pagination) => {
  return res.json({
    success: true,
    message,
    data,
    pagination
  });
};

const createdResponse = (res, message, data = null) => {
  return successResponse(res, message, data, 201);
};

const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 'NOT_FOUND', 404);
};

const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 'UNAUTHORIZED', 401);
};

const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, 'FORBIDDEN', 403);
};

const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    error: 'VALIDATION_ERROR',
    details: errors
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginationResponse,
  createdResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse
};