// https://rclayton.silvrback.com/custom-errors-in-node-js
class CustomError extends Error {
  constructor(message, status) {
    super(message)
    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name
    // This clips the constructor invocation from the stack trace.
    // It's not absolutely essential, but it does make the stack trace a little nicer.
    //  @see Node.js reference (bottom)
    Error.captureStackTrace(this, this.constructor)
  }
}

class PhoneNumberParseError extends CustomError {
  constructor(invalidNumber) {
    super('Invalid phone number')
    this.invalidNumber = invalidNumber
  }
}

class HttpError extends CustomError {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

class BadRequestError extends HttpError {
  constructor(message) {
    super(message, 400)
  }
}

class UnauthorizedError extends HttpError {
  constructor(msg) {
    super(msg, 401)
  }
}

const HttpErrors = {
  isHttpError: e => e instanceof HttpError,
  badRequest: msg => new BadRequestError(msg),
  unauthorized: msg => new UnauthorizedError(msg)
}

module.exports = {
  HttpErrors,
  PhoneNumberParseError
}
