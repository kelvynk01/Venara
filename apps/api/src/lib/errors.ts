/**
 * errors.ts — typed application errors mapped to HTTP by the Fastify error handler.
 * Routes/services throw these; the handler shapes them into the `apiErrorSchema` envelope.
 */

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, 'bad_request', message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'unauthorized', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'forbidden', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'not_found', message);
  }
}
