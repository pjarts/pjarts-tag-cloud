# Tag Cloud by Per Jonsson
Creates a tag cloud from a Twitter hashtag or an RSS link.

## Prerequisites
You need to [aquire an api key and secret from Twitter](https://developer.twitter.com/en/docs/basics/authentication/guides/access-tokens)

## Run locally

The application is divided into two packages, /app (front-end) and /server (back-end). You need to install and run these packages separately.

### Start the server
From the /server folder
* `npm install`
* `API_KEY={api-key} API_SECRET={api-secret} npm start`

The server will listen to port 3000

### Start the front-end dev server
From the /app folder
* `npm install`
* `npm start`

The front-end will be available at http://localhost:8000

## Built with
Node, Koa, Cycle.js, xstream

## TODO
* Tests
* Error handling
* Mobile portrait view
* Lots of stuff..
