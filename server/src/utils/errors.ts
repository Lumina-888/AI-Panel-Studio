export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
    this.name = 'ValidationError'
  }
}

export class LLMParseError extends AppError {
  constructor(message: string) {
    super('LLM_PARSE_ERROR', message, 502)
    this.name = 'LLMParseError'
  }
}
