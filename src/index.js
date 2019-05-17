if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const twilio = require('twilio')
const bodyParser = require('body-parser')
const Joi = require('@hapi/joi')
const app = require('express')()
const { HttpErrors, PhoneNumberParseError } = require('./errors')
const { parseNumbers, parseNumber } = require('./util')

const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_NUMBER,
  TWIML_API_URL,
  PORT
} = process.env
const client = twilio(TWILIO_SID, TWILIO_TOKEN)

const qs = params =>
  Object.entries(params)
    .map(param => param.map(s => encodeURIComponent(s)).join('='))
    .join('&')

const makeUrl = {
  forComeBontho: (name, place) =>
    `${TWIML_API_URL}/twiml/come-bontho?${qs({ name, place })}`
}

/*client.calls
  .create({
    url: makeUrl.forComeBontho('Joona', 'klusteri'),
    to: '+358452020486',
    from: TWILIO_NUMBER
  })
  .then(call => {
    console.log('sid', call.sid)
    console.log(call)
  })
  .catch(e => console.error('error', e))
*/

const apiAuth = (req, res, next) => {
  if (!req.query.api_key || req.query.api_key !== 'BONTHO') {
    return next(HttpErrors.unauthorized('invalid api_key'))
  }

  next()
}

app.use(bodyParser.json())

/**
 * @param {string} number
 * @returns {Promise<any>}
 */
const enqueueCall = (number, url) => {
  /*client.calls
    .create({ url, from: TWILIO_NUMBER, to: number })
    .then(call => ({ sid: call.sid }))
    .catch(e => ({ error: e }))*/
  return Promise.resolve(
    Math.random() > 0.5
      ? { error: new Error('lol fail') }
      : { sid: '1245nj2rjn213nj4jkkj23' }
  )
}

const inviteSchema = Joi.object().keys({
  numbers: Joi.array()
    .items(Joi.string())
    .required(),
  inviter: Joi.string()
    .max(100)
    .required(),
  place: Joi.string()
    .max(200)
    .required()
})

const validate = schema => (req, res, next) => {
  const { error, value } = Joi.validate(req.body, schema)
  if (error) {
    const msg = error.details.map(e => e.message).join(', ')
    return next(HttpErrors.badRequest(msg))
  }

  req.locals = { ...req.locals, body: value }
  next()
}

app.post(
  '/api/invite-bontho',
  apiAuth,
  validate(inviteSchema),
  async (req, res, next) => {
    const { numbers, inviter, place } = req.locals.body

    // Actually, try to parse the numbers **before** making calls so we either
    // fail with all or succeed with all (well, twilio might still error).
    // This lets us parse the numbers individually down there so we can provide
    // the user with the number he provided in the error instead of the E.164
    // version
    try {
      // throws error on invalid number
      parseNumbers(numbers)
    } catch (e) {
      if (e instanceof PhoneNumberParseError) {
        return next(HttpErrors.badRequest(`invalid number: ${e.invalidNumber}`))
      }
      return next(e)
    }

    const calls = await Promise.all(
      numbers.map(async number => {
        const parsedNumber = parseNumber(number)
        const call = await enqueueCall(
          parsedNumber,
          makeUrl.forComeBontho(inviter, place)
        )
        return { ...call, number, parsedNumber }
      })
    )

    const queued = calls.filter(({ error }) => !error)
    const failed = calls
      .filter(({ error }) => !!error)
      .map(data => ({ ...data, error: data.error.message }))

    res.json({ queued, failed })
  }
)

app.use((e, req, res, next) => {
  if (HttpErrors.isHttpError(e)) {
    return res.status(e.status).json({ error: e.message })
  }

  console.error(e)
  return res.status(500).json({ error: 'internal server error' })
})

app.listen(parseInt(PORT, 10), e => {
  if (e) {
    console.error(e)
    process.exit(1)
  }
  console.log(`Server listening on :${PORT}`)
})
