const axios = require('axios')

const { CONTENT_SERVICE_URL } = process.env

const getContent = () =>
  axios
    .get(CONTENT_SERVICE_URL)
    .then(({ data }) => data)
    .then(({ text }) => text)
    .catch(e => {
      console.error('contentService::getContent failed')
      console.error(e)
      // lol just read out error to user
      return e.message
    })

module.exports = {
  getContent
}
