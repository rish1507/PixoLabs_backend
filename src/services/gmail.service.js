const { google } = require('googleapis');
const { getOAuthClient } = require('../config/gmail');

exports.getGmailService = async (user) => {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(user.tokens);
  return google.gmail({ version: 'v1', auth: oauth2Client });
};
