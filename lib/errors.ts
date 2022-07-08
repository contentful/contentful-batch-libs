export class ContentfulTaskError extends Error {
  public originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.originalError = originalError;
  }
}
