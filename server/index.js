const Koa = require('koa')
const Router = require('koa-router')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const cors = require('@koa/cors')
const createError = require('http-errors')

const xs = require('xstream').default

const querystring = require('querystring')
const twitter = require('./twitterClient')
const { tokenize } = require('./tokenizer')
const RssParser = require('rss-parser')
const rssParser = new RssParser()


const API_KEY = 'gsva7EfWkCM75lS4UAZ7iZQY3'
const API_SECRET = 'Wj2YMC3ggVZ2pt5pkTmGx31FdwfOq0t7mAZGrKU6mIUW3EeqX2'

const MAX_NUM_TWEETS = 500
const TWEET_BATCH_SIZE = 100
const HASHTAG = '#beer'

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
    if (hashtag) {
      streams$.push(getTweetStream(
        `${hashtag} -filter:retweets`,
        {
          lang: 'en',
          count: 100,
          result_type: 'recent',
          limit: 100
        }
      ))
    }
    if (rssLink) {
      streams$.push(getRssStream(rssLink))
    }
    const stream$ = xs.merge(...streams$)
      .map(text => xs.from(tokenize(text)))
      .flatten()

    ctx.body = await new Promise((resolve, reject) => {
      stream$.addListener({
        next(token) {
          this.map.set(token, (this.map.get(token) || 0) + 1)
        },
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

function getRssStream (url) {
  return xs.fromPromise(rssParser.parseURL(url))
    .map(feed => xs.from(feed.items.reduce(
      (acc, item) => [...acc, item.contentSnippet], [])
    ))
    .flatten()
}

function getTweetStream (query, options = {}) {
  return xs.create({
    start: async function(listener) {
      this.run = true
      const token = options.accessToken
        || await twitter.getAccessToken(API_KEY, API_SECRET)
      const client = twitter.getClient(token)
      let params = {
        q: query,
        lang: options.lang,
        count: Math.min(options.count || 15, 100),
        result_type: options.result_type,
        include_entities: options.include_entities || false
      }
      let remaining = options.limit || 1000
      try {
        while (remaining-- && this.run) {
          // searches has to run in sequence as each one
          // depends on the result of the previous
          const res = await client.get('/search/tweets.json', { params })
          const { statuses, search_metadata } = res.data
          statuses.forEach(status => {
            listener.next(status.text)
          })
          const next = search_metadata.next_results
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
