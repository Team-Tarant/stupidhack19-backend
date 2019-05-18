const axios = require('axios')

const { CONTENT_SERVICE_URL } = process.env

const getContent = () =>
  axios
    .get(CONTENT_SERVICE_URL)
    .then(({ data }) => data)
    .then(({ text }) => text)
    .catch(e => e.message)

module.exports = {
  getContent
}
