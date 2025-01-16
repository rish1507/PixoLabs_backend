const { getGmailService } = require("../services/gmail.service");
const { generateAISummary,getActionFromEmail } = require("./ai.controller");
const OpenAI = require("openai");
const config = require("../config/config");
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});
exports.listEmails = async (req, res) => {
  try {
    const service = await getGmailService(req.user);
    const response = await service.users.messages.list({
      userId: "me",
      maxResults: 10,
      labelIds: ["INBOX"],
    });

    const emails = await Promise.all(
      response.data.messages.map(async (message) => {
        const email = await service.users.messages.get({
          userId: "me",
          id: message.id,
          format: "metadata",
          metadataHeaders: ["subject", "from"],
        });
        const headers = email.data.payload.headers;
        return {
          id: message.id, // This is the ID you should use
          threadId: email.data.threadId,
          subject: headers.find((h) => h.name.toLowerCase() === "subject")
            ?.value,
          from: headers.find((h) => h.name.toLowerCase() === "from")?.value,
          snippet: email.data.snippet,
        };
      })
    );
    res.json(emails);
  } catch (error) {
    console.error("List emails error:", error);
    res.status(500).json({ error: "Failed to list emails" });
  }
};
// src/controllers/email.controller.js

exports.sendEmail = async (req, res) => {
  try {
    const { emailId, content, subject } = req.body;
    const service = await getGmailService(req.user);

    // Get original message to extract recipient
    const originalMessage = await service.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });

    const headers = originalMessage.data.payload.headers;
    const fromHeader = headers.find(
      (h) => h.name.toLowerCase() === "from"
    )?.value;

    // Extract email address from the "From" header
    // It might be in format "Name <email@example.com>" or just "email@example.com"
    const toEmail = fromHeader.includes("<")
      ? fromHeader.match(/<(.+)>/)[1]
      : fromHeader;

    if (!toEmail) {
      return res.status(400).json({
        error: "Invalid recipient email",
        message: "Could not find recipient email address",
      });
    }

    // Create email message
    const message = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      `To: ${toEmail}\n`,
      `Subject: ${subject}\n\n`,
      content,
    ].join("");

    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await service.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessage.data.threadId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Send email error:", error);
    res.status(500).json({
      error: "Failed to send email",
      message: error.message,
      details: error.errors?.[0]?.message,
    });
  }
};

exports.replyToEmail = async (req, res) => {
  try {
    const { emailId } = req.params;
    const { content } = req.body;
    const service = await getGmailService(req.user);

    const originalMessage = await service.users.messages.get({
      userId: "me",
      id: emailId,
    });
    const headers = originalMessage.data.payload.headers;
    const subject = headers.find(
      (h) => h.name.toLowerCase() === "subject"
    )?.value;
    const to = headers.find((h) => h.name.toLowerCase() === "from")?.value;
    const messageId = headers.find(
      (h) => h.name.toLowerCase() === "message-id"
    )?.value;
    const message = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      "Content-Transfer-Encoding: 7bit\n",
      `To: ${to}\n`,
      `Subject: Re: ${subject}\n`,
      `In-Reply-To: ${messageId}\n`,
      `References: ${messageId}\n\n`,
      content,
    ].join("");
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await service.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: originalMessage.data.threadId,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Reply error:", error);
    res.status(500).json({ error: "Failed to reply to email" });
  }
};
exports.getEmailContent = async (req, res) => {
  try {
    const { emailId } = req.params;

    // Validate emailId format
    if (!emailId || emailId.includes("@")) {
      return res.status(400).json({
        error: "Invalid email ID format",
        message: "Please provide a valid Gmail message ID",
      });
    }

    const service = await getGmailService(req.user);

    // First, verify the message exists
    try {
      const email = await service.users.messages.get({
        userId: "me",
        id: emailId,
        format: "full",
      });

      const headers = email.data.payload.headers;
      const subject = headers.find(
        (h) => h.name.toLowerCase() === "subject"
      )?.value;
      const from = headers.find((h) => h.name.toLowerCase() === "from")?.value;
      const to = headers.find((h) => h.name.toLowerCase() === "to")?.value;

      let body = "";
      if (email.data.payload.parts) {
        body = email.data.payload.parts
          .filter((part) => part.mimeType === "text/plain")
          .map((part) => {
            if (part.body.data) {
              const buff = Buffer.from(part.body.data, "base64");
              return buff.toString();
            }
            return "";
          })
          .join("\n");
      } else if (email.data.payload.body.data) {
        const buff = Buffer.from(email.data.payload.body.data, "base64");
        body = buff.toString();
      }

      res.json({
        id: email.data.id,
        threadId: email.data.threadId,
        subject,
        from,
        to,
        body,
        date: headers.find((h) => h.name.toLowerCase() === "date")?.value,
        labels: email.data.labelIds,
      });
    } catch (apiError) {
      console.error("Gmail API Error:", apiError);
      if (apiError.status === 404) {
        return res.status(404).json({ error: "Email not found" });
      }
      throw apiError;
    }
  } catch (error) {
    console.error("Get email content error:", error);
    res.status(500).json({
      error: "Failed to get email content",
      message: error.message,
    });
  }
};
exports.getEmailSummaries = async (req, res) => {
  try {
    const service = await getGmailService(req.user);
    let emailsData = [];
    let emailSummaries = [];

    // Get list of emails
    let query = "category:primary -category:promotions -category:social";
    if (req.query.startDate && req.query.endDate) {
      const formattedStartDate = req.query.startDate.replace(/-/g, "/");
      const formattedEndDate = req.query.endDate.replace(/-/g, "/");
      query += ` after:${formattedStartDate} before:${formattedEndDate}`;
    }

    const response = await service.users.messages.list({
      userId: "me",
      maxResults: 10,
      labelIds: ["INBOX"],
      q: query,
    });

    if (!response.data.messages) {
      return res.json({ emailSummaries: [], emailsData: [] });
    }

    // Get detailed content and generate summaries for each email
    for (const message of response.data.messages) {
      const email = await service.users.messages.get({
        userId: "me",
        id: message.id,
        format: "full",
      });

      const headers = email.data.payload.headers;
      const fromHeader = headers.find(
        (h) => h.name.toLowerCase() === "from"
      )?.value;

      // Skip mailer-daemon emails
      if (
        fromHeader &&
        fromHeader.toLowerCase().includes("mailer-daemon@googlemail.com")
      ) {
        continue;
      }

      let body = "";
      if (email.data.payload.parts) {
        body = email.data.payload.parts
          .filter((part) => part.mimeType === "text/plain")
          .map((part) => {
            if (part.body.data) {
              const buff = Buffer.from(part.body.data, "base64");
              return buff.toString();
            }
            return "";
          })
          .join("\n");
      } else if (email.data.payload.body.data) {
        const buff = Buffer.from(email.data.payload.body.data, "base64");
        body = buff.toString();
      }

      const aiSummary = await generateAISummary(body);
      const action=await getActionFromEmail(body);
      // Push only valid emails into both arrays
      const emailData = {
        emailId: message.id,
        subject:
          headers.find((h) => h.name.toLowerCase() === "subject")?.value ||
          "No Subject",
        from: fromHeader || "Unknown Sender",
        date: headers.find((h) => h.name.toLowerCase() === "date")?.value,
        threadId: email.data.threadId,
        body: body, // Store the full email body
      };

      emailsData.push(emailData);

      emailSummaries.push({
        emailId: message.id,
        subject: emailData.subject,
        from: emailData.from,
        summary: aiSummary,
        date: emailData.date,
        threadId: emailData.threadId,
        action:action
      });
    }

    res.json({ emailSummaries, emailsData });
  } catch (error) {
    console.error("Get email summaries error:", error);
    res.status(500).json({
      error: "Failed to get email summaries",
      message: error.message,
    });
  }
};

const processBatchWithDelay = async (
  items,
  processFunction,
  delayMs = 1000
) => {
  const results = [];
  for (const item of items) {
    try {
      const result = await processFunction(item);
      results.push(result);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error("Batch processing error:", error);
    }
  }
  return results;
};
// src/controllers/email.controller.js

exports.generateEmailReply = async (req, res) => {
  try {
    const { instructions, emailId, subject, originalBody, from, sender } =
      req.body;

    // Generate email using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates professional email replies and keep email concise. and not include any placeholder only generate general email.",
        },
        {
          role: "user",
          content: `Original email subject: ${subject}\nOriginal email: ${originalBody}\n\nInstructions for reply: ${instructions}\n\nGenerate a professional reply email. and name of the reciever of this generated email will be ${from} and name of the sender of this generated email will be ${sender}`,
        },
      ],
    });

    const generatedContent = completion.choices[0].message.content;

    res.json({ content: generatedContent });
  } catch (error) {
    console.error("Generate email error:", error);
    res.status(500).json({ error: "Failed to generate email" });
  }
};

exports.editEmailWithAI = async (req, res) => {
  try {
    const { content, instructions } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that edits emails based on instructions.",
        },
        {
          role: "user",
          content: `Edit the following email according to these instructions: ${instructions}\n\nOriginal email:\n${content}`,
        },
      ],
    });

    res.json({ content: completion.choices[0].message.content });
  } catch (error) {
    console.error("Edit email error:", error);
    res.status(500).json({ error: "Failed to edit email" });
  }
};
