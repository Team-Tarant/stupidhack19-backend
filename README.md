# stupidhack19-backend

## API

### `POST /api/invite-bontho?api_key=<secret key>`

Body:

```js
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
```

#### Sample

Request:

```
POST /api/invite-bontho?api_key=<secret>

{
    "numbers": ["045 1234 123", "0403211234", "040 800 1234"],
    "inviter": "Jussi",
    "place": "Startup Sauna"
}

```

Response:

```json
{
  "queued": [
    {
      "sid": "1245nj2rjn213nj4jkkj23",
      "number": "045 1234 123",
      "parsedNumber": "+358451234123"
    }
  ],
  "failed": [
    {
      "error": "idk some error message twilio returns",
      "number": "0403211234",
      "parsedNumber": "+358403211234"
    },
    {
      "error": "idk some error message twilio returns",
      "number": "040 800 1234",
      "parsedNumber": "+358408001234"
    }
  ]
}
```

`sid` is the Twilio call SID. Not in actual format in this example.