const axios = require('axios')

const {
  CONTENT_SERVICE_URL,
  NEURALNET_SERVICE_URL
} = process.env

const feedToNeuralNetwork = outputText => axios
  .post(NEURALNET_SERVICE_URL, outputText)
  .then(({ data }) => data.trim())

const getContent = () =>
  axios
    .get(CONTENT_SERVICE_URL)
    .then(({ data }) => data)
    .then(({ text }) => text)
    .then(text => feedToNeuralNetwork(text))
    .catch(e => {
      console.error('contentService::getContent failed')
      console.error(e)
      // lol just read out error to user
      return e.message
    })

module.exports = {
  getContent
}
