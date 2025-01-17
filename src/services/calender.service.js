const { google } = require('googleapis');
const { getOAuthClient } = require('../config/gmail');
exports.getCalendarService = async (user) => {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials(user.tokens);
  return google.calendar({ version: 'v3', auth: oauth2Client });
};
