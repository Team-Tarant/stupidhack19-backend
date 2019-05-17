const PNF = require('google-libphonenumber').PhoneNumberFormat
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance()
const { PhoneNumberParseError } = require('./errors')

/**
 * Parses an array of Finnish phone numbers and returns them formatted in E.164
 * format (+358401234567).
 * @throws {PhoneNumberParseError} if any invalid numbers were found
 */
const parseNumbers = numbers => {
  return numbers.map(number => {
    try {
      const parsed = phoneUtil.parse(number, 'FI')

      if (!phoneUtil.isValidNumber(parsed)) {
        throw new PhoneNumberParseError(number)
      }

      return phoneUtil.format(parsed, PNF.E164)
    } catch (e) {
      throw new PhoneNumberParseError(number)
    }
  })
}

const parseNumber = number => {
  try {
    const parsed = phoneUtil.parse(number, 'FI')

    if (!phoneUtil.isValidNumber(parsed)) {
      throw new PhoneNumberParseError(number)
    }

    return phoneUtil.format(parsed, PNF.E164)
  } catch (e) {
    throw new PhoneNumberParseError(number)
  }
}

module.exports = {
  parseNumbers,
  parseNumber
}
