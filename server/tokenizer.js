const stopWords = require('./stopWords')
// const natural = require('natural')
// const tokenizer = new natural.WordTokenizer()

function tokenize(str = '') {
  return str
    .toLowerCase()
    // split at whitespace and/or punctuation
    .split(/[\.,!?():;]?[\s]+/)
    .filter(token => isWord(token) && !isStopWord(token))
}

function isWord (str) {
  return /^[a-z]+[\w\']+$/.test(str)
}

function isStopWord (str) {
  return stopWords.includes(str)
}

module.exports = {
  tokenize
}