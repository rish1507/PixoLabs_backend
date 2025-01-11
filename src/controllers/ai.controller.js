const OpenAI = require('openai');
const config = require('../config/config');
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});
exports.generateEmail = async (prompt,emails,name) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates professional emails. Do not include placeholder in emails I only want general content. Keep the emails very concise.I am giving you sample data. Look at the sample data very carefully and notice that the name Rishab Gupta has the email address ressi.54@gmail.com.When a user mentions a name, pick the corresponding email ID from this:${emails}.Use my user name when syaing thank you ${name} and most important thing do not include subject when You will generate email.`
        },
        {
          role: "user",
          content: `Generate a professional email for the following request and it should contain only genral content not placeholder.: ${prompt}}`
        }
      ]
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('AI generation error:', error);
    return "Could not generate email"
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
          content: "You are a helpful assistant that edits emails based on provided instructions."
        },
        {
          role: "user",
          content: `Edit the following email according to these instructions: ${instructions}\n\nOriginal email:\n${content}`
        }
      ]
    });

    res.json({ content: completion.data.choices[0].message.content });
  } catch (error) {
    console.error('AI editing error:', error);
    res.status(500).json({ error: 'Failed to edit email' });
  }
};
exports.generateAISummary=async (emailContent)=> {
  try {
      const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
              {
                  role: "system",
                  content: "You are a helpful assistant that creates concise, clear summaries of emails. Keep summaries to 1-2 sentences maximum. Focus on the main point and any required actions."
              },
              {
                  role: "user",
                  content: `Please summarize this email content: ${emailContent}`
              }
          ],
          max_tokens: 150 // Limit response length
      });
      return completion.choices[0].message.content.trim();
  } catch (error) {
      console.error('AI Summary generation error:', error);
      return  emailContent.substring(0, 100) + '...';
  }
}
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
                  content: "You are a helpful assistant that summarizes Gmail inbox messages.While summarizing, give the emailID and subject of every email you summarize in new line. and emailID should be a emailID not a number"
              },
              {
                  role: "user",
                  content: prompt
              }
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