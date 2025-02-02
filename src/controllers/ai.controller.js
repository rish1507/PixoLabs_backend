const OpenAI = require("openai");
const config = require("../config/config");
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});
exports.generateEmail = async (prompt, emails, name) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates professional emails. Do not include placeholder in emails I only want general content. Keep the emails very concise.I am giving you sample data. Look at the sample data very carefully and notice that the name Rishab Gupta has the email address ressi.54@gmail.com.When a user mentions a name, pick the corresponding email ID from this:${emails}.Use my user name when syaing thank you ${name} and most important thing do not include subject when You will generate email.`,
        },
        {
          role: "user",
          content: `Generate a professional email for the following request and it should contain only  contain genral content not placeholder and do not include subject only write reply.: ${prompt}}`,
        },
      ],
    });
    console.log(completion.choices[0].message.content);
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("AI generation error:", error);
    return "Could not generate email";
  }
};

exports.editEmailWithAI = async (req, res) => {
  try {
    const { content, instructions } = req.body;

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that edits emails based on provided instructions.",
        },
        {
          role: "user",
          content: `Edit the following email according to these instructions: ${instructions}\n\nOriginal email:\n${content}`,
        },
      ],
    });

    res.json({ content: completion.data.choices[0].message.content });
  } catch (error) {
    console.error("AI editing error:", error);
    res.status(500).json({ error: "Failed to edit email" });
  }
};
exports.generateAISummary = async (emailContent) => {
  console.log("hi");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that creates concise, clear summaries of emails and length should not be more than 25 words. Keep summaries to 1-2 sentences maximum. Focus on the main point and any required actions.",
        },
        {
          role: "user",
          content: `Please summarize this email content: ${emailContent}`,
        },
      ],
      max_tokens: 150, // Limit response length
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI Summary generation error:", error);
    return emailContent.substring(0, 100) + "...";
  }
};
exports.summarizeAllEmails = async (emailData) => {
  try {
    if (!emailData || !Array.isArray(emailData)) {
      return undefined;
    }
    let emailTexts = "";
    emailData.forEach((emailItem) => {
      const sender = emailItem.from || "Unknown Sender";
      const subject = emailItem.subject || "No Subject";
      const snippet = emailItem.body || "No Content";
      emailTexts += `Sender: ${sender}\nSubject: ${subject}\nSnippet: ${snippet}\n\n`;
    });

    const prompt = `
      You are the Gmail inbox assistant. I have the following emails from my Primary inbox:
    ${emailTexts}
    Decide if there are any messages that seem interesting. Make a summary of the emails that seem interesting with “Sender Name”, “What is the sender asking for in 2 lines”. Don't provide detail on spam-looking messages, or messages that appear to be selling a service or software. You can offer to perform actions like schedule time.
    Example summary:
    Your inbox for today includes 4 spam messages, and 1 message from Devin who seems interested in your product - [here's the link](https://linkedin.com/in/devin). Terri has still not responded to your question about scheduling an onboarding call. Would you like me to respond to Devin with your availability.
    Generate a similar summary based on the provided emails.
      `;

    // Send the request to OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that summarizes Gmail inbox messages.While summarizing, give the emailID and subject of every email you summarize in new line. and emailID should be a emailID not a number",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    // Extract the summary from the response
    const summary = response.choices[0].message.content.trim();
    return summary;
  } catch (error) {
    console.error("Error while summarizing emails:", error);
    throw error;
  }
};
exports.getActionFromEmail = async (emailContent) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that extracts the main action required from an email. Keep the response concise, clear, and limited to 10 words.",
        },
        {
          role: "user",
          content: `What is the action required from this email: ${emailContent}`,
        },
      ],
      max_tokens: 50, // Limit response length
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating action from email:", error);
    return "Unable to determine action required. Please review the email.";
  }
};
exports.isEmailFromHuman = async (emailContent) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a helpful assistant that determines whether an email is written by a human or is a promotional/newsletter email. Respond with 'Yes' if it is from a human, and 'No' if it is a promotional or newsletter email. 
Here are some examples:
1. Human Email Example: 
   - "Hi John, can we reschedule the meeting to next week? Let me know what works for you. Thanks!"
   - Answer: Yes
2. Promotional Email Example: 
   - "50% off all items this weekend only! Visit our store to grab amazing deals."
   - Answer: No
3. Newsletter Example: 
   - "Here's your weekly digest: 10 tips for productivity and this week's top articles."
   - Answer: No
4. Human Email Example:
   - "Hi Nodify,  
     I’m introducing you to Alex. Would love for you guys to chat. What do you think about Glean’s software? 
     
     Regards, 
     Shelly Natalia"
   - Answer: Yes
5. Human Email Example:
   - "Hi Nodify, 
     I saw you are interested in a car. Please let me know if I can help you with any details. 
     
     Best, 
     Raghav 
     Senior VP"
   - Answer: Yes
6. Human Email Example:
   - "Hi Nodify, 
     Hope all is well. I’m looking to chat with you regarding your product let me know. 
     
     Thanks, 
     Rishab Gupta"
   - Answer: Yes
Analyze the following email content and respond with 'Yes' or 'No'.`,
        },
        {
          role: "user",
          content: `Email Content: ${emailContent}`,
        },
      ],
      max_tokens: 5, // Response is limited to 'Yes' or 'No'
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error determining if email is from a human:", error);
    return "Unable to determine. Please review manually.";
  }
};
exports.checkAvailability = async (req, res) => {
  console.log(req.body.slots, req.body.prompt);

  try {
    // Helper function to format time in 12-hour format with timezone
    const formatTime = (dateString, timeZone) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: timeZone,
      });
    };

    // Helper function to format date with timezone
    const formatDate = (dateString, timeZone) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: timeZone,
      });
    };

    // Group slots by date and timezone
    const groupedSlots = req.body.slots.reduce((acc, slot) => {
      const date = new Date(slot.start).toLocaleDateString("en-US", {
        timeZone: slot.timeZone,
      });
      if (!acc[date]) {
        acc[date] = {
          slots: [],
          timeZone: slot.timeZone,
        };
      }
      acc[date].slots.push(slot);
      return acc;
    }, {});

    // Process each date's slots
    let availabilityData = [];

    Object.entries(groupedSlots).forEach(([date, { slots, timeZone }]) => {
      // Sort slots by start time
      slots.sort((a, b) => new Date(a.start) - new Date(b.start));

      const dateFormatted = formatDate(slots[0].start, timeZone);
      const dayData = {
        date: dateFormatted,
        timeZone: timeZone,
        freeSlots: [],
        busySlots: [],
      };

      // Add free slots
      slots.forEach((slot) => {
        dayData.freeSlots.push({
          start: formatTime(slot.start, timeZone),
          end: formatTime(slot.end, timeZone),
        });
      });

      // Find busy slots (gaps between free slots)
      for (let i = 0; i < slots.length - 1; i++) {
        const currentEndTime = new Date(slots[i].end);
        const nextStartTime = new Date(slots[i + 1].start);

        if (nextStartTime - currentEndTime > 1000 * 60) {
          // More than 1 minute gap
          dayData.busySlots.push({
            start: formatTime(slots[i].end, timeZone),
            end: formatTime(slots[i + 1].start, timeZone),
          });
        }
      }

      availabilityData.push(dayData);
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an assistant that helps check availability based on calendar data. The data includes both free slots and busy/meeting slots for each day. Include a thank-you note at the end addressing the user by their name. Keep responses clear and concise. Break it down by 
“ You have meetings from:
1. 
2. 

And you are free at : 
1. 
2.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            availabilityData: availabilityData,
            prompt: req.body.prompt,
            userName: req.user.name,
          }),
        },
      ],
    });

    res.json({ time: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI generation error:", error);
    res.status(500).json({ error: "Could not determine availability." });
  }
};
