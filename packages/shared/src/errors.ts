export class DomainError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Conflict — document was edited elsewhere') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class PayloadTooLargeError extends DomainError {
  constructor(message = 'Payload too large') {
    super(message, 413);
    this.name = 'PayloadTooLargeError';
  }
}

export class UnsupportedMediaError extends DomainError {
  constructor(message = 'Unsupported file type') {
    super(message, 415);
    this.name = 'UnsupportedMediaError';
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Validation error') {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

export class HttpOutboundError extends DomainError {
  constructor(message = 'Outbound HTTP error') {
    super(message, 502);
    this.name = 'HttpOutboundError';
  }
}
