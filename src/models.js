const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { parseNumber } = require('./util')

const PHONE_BCRYPT_COST = 10

const Responses = {
  NO_RESPONSE_YET: null,
  IS_DOWN: 'IS_DOWN',
  IS_NOT_DOWN: 'IS_NOT_DOWN'
}

const invitationSchema = new mongoose.Schema(
  {
    phoneHash: String,
    sid: String,
    response: String,
    inviter: String,
    place: String
  },
  {
    timestamps: true
  }
)

/**
 * @param {boolean} isDown
 */
invitationSchema.methods.setIsDown = function setIsDown(isDown) {
  this.response = isDown ? Responses.IS_DOWN : Responses.IS_NOT_DOWN
}

invitationSchema.methods.hasResponded = function hasResponded() {
  return this.response !== null
}

/**
 * @param {{number: string, sid: string}[]} calls
 */
invitationSchema.statics.createSent = async function createSent(inviter, place, calls) {
  // store the E.164 formatted number so that "040 123 4567" and "040 1234 567"
  // are not different numbers
  const callsToCreate = await Promise.all(
    calls.map(async ({ sid, number }) => {
      const e164number = parseNumber(number)
      return {
        sid,
        // hash the number cos I don't want to store personal information geez
        phoneHash: await bcrypt.hash(e164number, PHONE_BCRYPT_COST),
        response: Responses.NO_RESPONSE_YET,
        inviter,
        place
      }
    })
  )

  return this.create(callsToCreate)
}

const Invitation = mongoose.model('Invitation', invitationSchema)

module.exports = {
  Invitation
}
