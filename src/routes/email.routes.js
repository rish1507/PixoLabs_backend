const express = require("express");
const router = express.Router();
const {
  listEmails,
  getEmailContent,
  sendEmail,
  replyToEmail,
  getEmailSummaries,
  generateEmailReply,
  editEmailWithAI,
} = require("../controllers/email.controller");
const { authMiddleware } = require("../middleware/auth");

router.use(authMiddleware);
router.get("/list", listEmails);
router.get("/summaries", getEmailSummaries);
router.get("/:emailId", getEmailContent);
router.post("/send", sendEmail);
router.post("/reply/:emailId", replyToEmail);
router.post("/generate", generateEmailReply);
router.post("/edit", editEmailWithAI);
module.exports = router;
