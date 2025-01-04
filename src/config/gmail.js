const { google } = require('googleapis');
const config = require('./config');

exports.getOAuthClient = () => {
    return new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        'https://www.pixolabs.com//auth/callback'  // Hardcode the redirect URI here
    );
};