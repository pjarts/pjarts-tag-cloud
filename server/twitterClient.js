const axios = require('axios')

module.exports = {
  async getAccessToken(key, secret) {
    const authString = `${encodeURIComponent(key)}:${encodeURIComponent(secret)}`
    const credentials = Buffer.from(authString).toString('base64')
    try {
      const res = await axios({
        method: 'post',
        url: 'https://api.twitter.com/oauth2/token',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        data: `grant_type=client_credentials`
      })
      const token = res.data.access_token
      this.authenticate = token
      return token
    } catch (err) {
      if (err.response) {
        err.response.data.errors.forEach(e => {
          console.log(e)
        })
        throw new Error(`Authentication failed`)
      } else if (err.request) {
        console.log(error.request)
        throw new Error('No response from authentication attempt')
      } else {
        console.log(error.message)
        throw new Error('Failed to send authentication request')
      }
    }
  },
  
  getClient(accessToken) {
    return axios.create({
      baseURL: 'https://api.twitter.com/1.1',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  }
}
