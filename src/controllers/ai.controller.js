const OpenAI = require('openai');
const config = require('../config/config');
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});
exports.generateEmail = async (req, res) => {
  try {
    const { prompt, emails } = req.body;
    
    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that generates professional emails. Do not include placeholder in emails I only want general content. Keep the emails very concise.I am giving you sample data. Look at the sample data very carefully and notice that the name Rishab Gupta has the email address ressi.54@gmail.com.When a user mentions a name, pick the corresponding email ID from this. Use my user name when syaing thank you and most important thing do not include subject when You will generate email.`
        },
        {
          role: "user",
          content: `Generate a professional email for the following request and it should contain only genral content not placeholder.:${prompt}`
        }
      ]
    });

    res.json({ content: completion.data.choices[0].message.content });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ error: 'Failed to generate email' });
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