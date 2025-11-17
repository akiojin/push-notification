export interface ErrorDetails {
  [key: string]: unknown;
}

import type { ZodError } from 'zod';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
}

export function buildErrorResponse(
  code: string,
  message: string,
  details?: ErrorDetails,
): ErrorResponse {
  return {
    error: details ? { code, message, details } : { code, message },
  };
}

export function buildValidationError(details: ErrorDetails): ErrorResponse {
  return buildErrorResponse('VALIDATION_ERROR', 'Request validation failed', details);
}

export function zodErrorToDetails(error: ZodError): ErrorDetails {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    })),
  };
}
