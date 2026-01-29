/**
 * Error Handler Utility
 * Maps raw database/API errors to user-friendly messages
 * Prevents information disclosure about system internals
 */

export function getUserFriendlyError(error: unknown, context: string): string {
  const errorMessage = extractErrorMessage(error).toLowerCase();
  
  // Rate limiting - keep the message
  if (errorMessage.includes('rate_limit') || errorMessage.includes('too many')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }

  // Session errors (check before generic permission errors)
  if (isSessionExpiredError(error)) {
    return 'Your session has expired. Please log in again.';
  }

  // Permission errors
  if (
    errorMessage.includes('permission_denied') ||
    errorMessage.includes('not authorized') ||
    errorMessage.includes('policy') ||
    errorMessage.includes('permission denied')
  ) {
    return 'You do not have permission to perform this action.';
  }

  // Duplicate/unique constraint errors
  if (
    errorMessage.includes('unique constraint') ||
    errorMessage.includes('already exists') ||
    errorMessage.includes('duplicate key') ||
    errorMessage.includes('duplicate_entry')
  ) {
    return 'This record already exists. Please check your input.';
  }

  // Foreign key/dependency errors
  if (
    errorMessage.includes('foreign key') ||
    errorMessage.includes('violates') ||
    errorMessage.includes('dependency')
  ) {
    return 'Unable to complete this action due to existing dependencies.';
  }

  // Not found errors
  if (
    errorMessage.includes('resource_not_found') ||
    errorMessage.includes('not found') ||
    errorMessage.includes('does not exist')
  ) {
    return 'The requested resource was not found.';
  }

  // Validation errors - provide slightly more detail
  if (errorMessage.includes('validation_error')) {
    if (errorMessage.includes('price') || errorMessage.includes('amount')) {
      return 'Please enter a valid amount.';
    }
    if (errorMessage.includes('name')) {
      return 'Please enter a valid name.';
    }
    if (errorMessage.includes('description')) {
      return 'Please provide a description.';
    }
    if (errorMessage.includes('format') || errorMessage.includes('input')) {
      return 'Please check your input and try again.';
    }
    return 'Please check your input and try again.';
  }

  // Authentication errors
  if (
    errorMessage.includes('invalid login') ||
    errorMessage.includes('invalid credentials') ||
    errorMessage.includes('wrong password')
  ) {
    return 'Invalid email or password. Please try again.';
  }

  if (errorMessage.includes('already registered')) {
    return 'This email is already registered. Please sign in instead.';
  }

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection')
  ) {
    return 'Unable to connect. Please check your internet connection.';
  }

  // Default safe message
  return `Unable to ${context}. Please try again or contact support.`;
}

/**
 * Detect session-expired errors across our RPCs.
 */
export function isSessionExpiredError(error: unknown): boolean {
  const msg = extractErrorMessage(error).toLowerCase();

  return (
    msg.includes('session expired') ||
    msg.includes('expired session') ||
    msg.includes('invalid session') ||
    msg.includes('invalid or expired session') ||
    msg.includes('session_expired') ||
    // Some RPCs prefix errors
    msg.includes('permission_denied: session')
  );
}

/**
 * Extract message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (!error) return '';
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  
  return '';
}

/**
 * Log error for debugging (only in development)
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}] Error:`, error);
  }
  // In production, you could send to a logging service here
}
