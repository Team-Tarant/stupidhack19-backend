if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const twilio = require('twilio')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const Joi = require('@hapi/joi')
const app = require('express')()
const { Invitation } = require('./models')
const { HttpErrors, PhoneNumberParseError } = require('./errors')
const { parseNumbers, parseNumber } = require('./util')
const { getContent } = require('./services/contentService')

const {
  TWILIO_SID,
  TWILIO_TOKEN,
  TWILIO_NUMBER,
  TWIML_API_URL,
  PORT,
  SUPER_API_KEY,
  SUPER_TWILIO_API_KEY,
  MONGODB_URI
} = process.env

const client = twilio(TWILIO_SID, TWILIO_TOKEN)

const qs = params =>
  Object.entries(params)
    .map(param => param.map(s => encodeURIComponent(s)).join('='))
    .join('&')

const makeUrl = {
  forComeBontho: (name, place) =>
    `${TWIML_API_URL}/twiml/come-bontho?${qs({ name, place })}`,
  forBonthoCall: text =>
    `${TWIML_API_URL}/twiml/bontho-call?${qs({ text })}`,

}

const apiAuth = expectedApiKey => (req, res, next) => {
  if (!req.query.api_key || req.query.api_key !== expectedApiKey) {
    return next(HttpErrors.unauthorized('invalid api_key'))
  }
  next()
}

app.use(bodyParser.json())

/**
 * @param {string} number
 * @returns {Promise<{sid: string} | {error: any}>}
 */
const enqueueCall = (number, url) =>
  client.calls
    .create({ url, from: TWILIO_NUMBER, to: number })
    .then(call => {
      const { sid, error_message, error_code } = call

      if (error_message || error_code) {
        console.error(error_code, error_message)
        return { error: `${error_code}: ${error_message}` }
      }

      return { sid }
    })
    .catch(e => {
      console.error(e)
      return { error: e }
    })

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

const subscribeSchema = Joi.object().keys({
  number: Joi.string().required()
})

const validateBody = schema => (req, res, next) => {
  const { error, value } = Joi.validate(req.body, schema)
  if (error) {
    const msg = error.details.map(e => e.message).join(', ')
    return next(HttpErrors.badRequest(msg))
  }

  req.locals = { ...req.locals, body: value }
  next()
}

const demoRandomCall = async number => {
  const text = await getContent()
  setTimeout(() => {
    enqueueCall(number, makeUrl.forBonthoCall(text))
  }, 20000)
}

app.get('/api/invitations', apiAuth(SUPER_API_KEY), async (req, res, next) => {
  const invitations = await Invitation.find({})
  res.json(invitations)
})

const responseSchema = Joi.object().keys({
  sid: Joi.string().required(),
  isDown: Joi.bool().required()
})

app.post(
  '/api/response',
  apiAuth(SUPER_TWILIO_API_KEY),
  validateBody(responseSchema),
  async (req, res) => {
    const { sid, isDown } = req.locals.body
    const invitation = await Invitation.findOne({ sid })

    if (!invitation) {
      // uhhh okay
      return res.status(200).json({ ok: 'ok' })
    }

    if (invitation.hasResponded()) {
      // uhhhhhhhh duplicate?
      return res.status(200).json({ ok: 'ok' })
    }

    invitation.setIsDown(isDown)
    await invitation.save()
    res.status(200).json({ ok: 'ok' })
  }
)

app.post(
  '/api/invite-bontho',
  apiAuth(SUPER_API_KEY),
  validateBody(inviteSchema),
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

    try {
      // save queued calls to db
      await Invitation.createSent(queued)
    } catch (e) {
      console.error('error while saving invitations to db', e)
    }

    res.json({ queued, failed })
  }
)

app.post(
  '/api/subscribe',
  apiAuth(SUPER_API_KEY),
  validateBody(subscribeSchema),
  async (req, res) => {
    const { number } = req.locals.body
    demoRandomCall(number)
    res.json({ status: 'success' })
  }
)

app.use('*', (req, res, next) => res.status(404).json({ error: 'not found' }))

app.use((e, req, res, next) => {
  if (HttpErrors.isHttpError(e)) {
    return res.status(e.status).json({ error: e.message })
  }

  console.error(e)
  return res.status(500).json({ error: 'internal server error' })
})

console.log('Connecting to MongoDB')
mongoose.connect(MONGODB_URI, { useNewUrlParser: true }).then(
  () => {
    console.log('Connected to MongoDB')
    app.listen(parseInt(PORT, 10), e => {
      if (e) {
        console.error(`Failed to bind to port ${PORT}`)
        console.error(e)
        process.exit(1)
      }
      console.log(`Server listening on :${PORT}`)
    })
  },
  e => {
    console.error('Failed to connect to MongoDB', { MONGODB_URI })
    console.error(e)
    process.exit(1)
  }
)
