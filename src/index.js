if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const twilio = require('twilio')
const bodyParser = require('body-parser')
const app = require('express')()
const { HttpErrors, PhoneNumberParseError } = require('./errors')
const { parseNumbers } = require('./util')

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

app.post('/api/invite-bontho', apiAuth, (req, res, next) => {
  const { numbers } = req.body

  if (!numbers || !Array.isArray(numbers)) {
    return next(
      HttpErrors.badRequest('numbers was missing or was not an array')
    )
  }

  try {
    const e164Numbers = parseNumbers(numbers)
    res.json({ numbers: e164Numbers })
  } catch (e) {
    if (e instanceof PhoneNumberParseError) {
      next(HttpErrors.badRequest(`invalid number: ${e.invalidNumber}`))
    } else {
      next(e)
    }
  }
})

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
