const { google } = require("googleapis");
const { getOAuthClient } = require("../config/gmail");
const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const codeCache = new Set(); 
exports.authenticate = async (req, res) => {
  try {
    const oauth2Client = getOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      redirect_uri: "http://localhost:5173/auth/callback", // Match exactly with Google Console
      prompt: "consent", // Add this to force consent screen
    });
    console.log(authUrl);
    res.json({ url: authUrl });
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};


exports.callback = async (req, res) => {
  try {
    const { code } = req.query;
    if (codeCache.has(code)) {
      return res.status(400).json({ error: "Authorization code already used" });
    }
    codeCache.add(code);
    const oauth2Client = getOAuthClient();
    // Get token with explicit redirect URI
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: "http://localhost:/auth/callback",
    });
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    // Create or update user
    const user = await User.findOneAndUpdate(
      { googleId: userInfo.data.id },
      {
        googleId: userInfo.data.id,
        email: userInfo.data.email,
        name: userInfo.data.name,
        tokens,
      },
      { upsert: true, new: true }
    );
    const jwtToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "84h" }
    );
    // Send response and return immediately to prevent multiple executions
    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Callback error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
};
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { tokens: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
};
