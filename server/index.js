// node
const querystring = require('querystring')

// koa
const Koa = require('koa')
const Router = require('koa-router')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const cors = require('@koa/cors')
const createError = require('http-errors')

// other
const xs = require('xstream').default
const RssParser = require('rss-parser')

// local
const twitter = require('./twitterClient')
const { tokenize } = require('./tokenizer')

const API_KEY = process.env.API_KEY
const API_SECRET = process.env.API_SECRET

const rssParser = new RssParser()
const app = new Koa()
const router = new Router()

router
  .post('/tags', async (ctx, next) => {
    const { hashtag, rssLink } = ctx.request.body
    if (!(hashtag || rssLink)) {
      throw createError.BadRequest(
        'One of `hashtag` or `rssLink` must be present in the request payload'
      )
    }
    const streams$ = []
    // if hashtag is set, get a stream of tweets
    // and push it to the array
    if (hashtag) {
      streams$.push(getTweetStream(
        `${hashtag} -filter:retweets`,
        {
          lang: 'en',
          count: 100,
          result_type: 'recent',
          limit: 500
        }
      ))
    }
    // if rssLink is set, get a stream of feeds
    if (rssLink) {
      streams$.push(getRssStream(rssLink))
    }
    // merge streams into one and parse texts into tokens
    const stream$ = xs.merge(...streams$)
      .map(text => xs.from(tokenize(text)))
      .flatten()
    // listen to the stream and add tokens to a map
    // on every emit.
    ctx.body = await new Promise((resolve, reject) => {
      stream$.addListener({
        next(token) {
          this.map.set(token, (this.map.get(token) || 0) + 1)
        },
        // transform the map into an array and send it
        // as the response body
        complete() {
          const result = Array.from(this.map)
            .sort((a, b) => a[1] > b[1] ? -1 : 1)
            .slice(0, 100)
          resolve(result)
        },
        error(err) {
          reject(err)
        },
        map: new Map()
      })
    })
  })

app
  .use(logger())
  .use(cors())
  .use(bodyparser())
  .use(router.routes())
  .use(router.allowedMethods())

app.listen(3000)

/**
 * Get a stream of texts from a RSS feed at the given URL
 * @param {string} url 
 */
function getRssStream (url) {
  return xs.fromPromise(rssParser.parseURL(url))
    .map(feed => xs.from(feed.items.reduce(
      (acc, item) => [...acc, item.contentSnippet], [])
    ))
    .flatten()
}

/**
 * Get a stream of tweets from a given hashtag
 * @param {string} query 
 * @param {object} options 
 */
function getTweetStream (query, options = {}) {
  return xs.create({
    start: async function(listener) {
      this.run = true
      // get an access token if not present
      const token = options.accessToken
        || await twitter.getAccessToken(API_KEY, API_SECRET)
      const client = twitter.getClient(token)
      // query params object
      let params = {
        q: query,
        lang: options.lang,
        // a maximum of 100 tweets can be retreived at a time
        count: Math.min(options.count || 15, 100),
        result_type: options.result_type,
        include_entities: options.include_entities || false
      }
      let remaining = options.limit || 1000
      try {
        // send requests sequentially until
        while (remaining && this.run) {
          // searches has to run in sequence as each one
          // depends on the result of the previous
          const res = await client.get('/search/tweets.json', { params })
          const { statuses, search_metadata } = res.data
          statuses.forEach(status => {
            listener.next(status.text)
          })
          const next = search_metadata.next_results
          remaining -= statuses.length
          if (next) {
            // create a new params objects from the returned querystring
            params = querystring.parse(next.substr(1))
          } else {
            this.run = false
          }
        }
      } catch (err) {
        listener.error(err)
      }
      listener.complete()
    },
    stop: function () {
      this.run = false
    },
    run: false
  })
}
