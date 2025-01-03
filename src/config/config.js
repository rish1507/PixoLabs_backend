module.exports = {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost/email-workflow'
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '7d'
    }
  };