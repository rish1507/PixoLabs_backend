const { WebClient } = require('@slack/web-api');
const { summarizeAllEmails } = require('./ai.controller');
let slackClient;
let emails = [];
let generatedEmail = '';
let CHANNEL_ID = null;
let name=null;
const {generateEmail}=require("./ai.controller")
const initializeSlackClient = (token, channelId) => {
  slackClient = new WebClient(token);
  CHANNEL_ID = channelId;
};

exports.initialize = async (req, res) => {
  try {
    const { slackToken, channelId, gmailCredentials } = req.body;
    name=req.user.name;
    if (!slackToken || !channelId) {
      return res.status(400).json({ 
        error: 'Both slackToken and channelId are required' 
      });
    }
    initializeSlackClient(slackToken, channelId);
    try {
      await slackClient.conversations.join({ channel: CHANNEL_ID });
    } catch (channelError) {
      if (!channelError.message.includes('already_in_channel')) {
        throw channelError;
      }
    }
    res.json({ 
      success: true, 
      message: 'Services initialized successfully',
      channelId: CHANNEL_ID,
    });
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Function to send initial message with just the Start Chat button
async function sendInitialMessage(channelId, text) {
  try {
    const message = {
      channel: channelId,
      text: text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Start Chat",
                emoji: true
              },
              action_id: "start_chat_button"
            }
          ]
        }
      ]
    };

    return await slackClient.chat.postMessage(message);
  } catch (error) {
    console.error('Error sending initial message:', error);
    throw error;
  }
}
async function handleApprovalSelection(triggerId, channelId, messageTs, originalText) {
  try {
    // Create options from available emails
    const options = emails.map(email => ({
      text: {
        type: 'plain_text',
        text: email.subject || 'No Subject'
      },
      value: email.id
    }));

    // Open modal for subject selection
    await slackClient.views.open({
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'subject_selection_modal',
        title: {
          type: 'plain_text',
          text: 'Select Email Thread'
        },
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Please select the email thread you want to reply to:'
            }
          },
          {
            type: 'input',
            block_id: 'email_subject',
            element: {
              type: 'static_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select an email thread'
              },
              options: options,
              action_id: 'subject_selected'
            },
            label: {
              type: 'plain_text',
              text: 'Email Thread'
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        private_metadata: JSON.stringify({
          channelId,
          messageTs,
          originalText
        })
      }
    });
  } catch (error) {
    console.error('Error in handleApprovalSelection:', error);
    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `❌ Error: ${error.message}`
    });
  }
}

// Function to send message with approval buttons after email generation
async function sendMessageWithApprovalButtons(channelId, text) {
  try {
    const message = {
      channel: channelId,
      text: text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Approve",
                emoji: true
              },
              style: "primary",
              action_id: "approve_email"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Edit with AI",
                emoji: true
              },
              action_id: "edit_with_ai"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Edit Myself",
                emoji: true
              },
              action_id: "edit_myself"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Reject",
                emoji: true
              },
              style: "danger",
              action_id: "reject_email"
            }
          ]
        }
      ]
    };

    return await slackClient.chat.postMessage(message);
  } catch (error) {
    console.error('Error sending message with approval buttons:', error);
    throw error;
  }
}

exports.handleInteractive = async (req, res) => {
    // Check if payload exists
    if (!req.body || !req.body.payload) {
      console.log("No payload received in request");
      return res.status(400).json({ error: 'No payload received' });
    }
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, user, channel, trigger_id } = payload;
    if (type === 'block_actions') {
      const action = payload.actions[0];
      const messageTs = payload.message.ts;
      const originalText = payload.message.blocks[0].text.text;

      switch (action.action_id) {
        case 'start_chat_button':
          await openEmailGenerationModal(trigger_id, channel.id);
          break;
        case 'approve_email':
          await handleApprovalSelection(trigger_id, channel.id, messageTs, originalText);
          break;
        case 'edit_with_ai':
          await handleAIEdit(trigger_id, channel.id, messageTs, originalText);
          break;
        case 'edit_myself':
          await handleManualEdit(trigger_id, channel.id, messageTs, originalText);
          break;
        case 'reject_email':
          await handleRejection(user.id, channel.id, messageTs, originalText);
          break;
      }
    } else if (type === 'view_submission') {
      await handleModalSubmission(payload);
    }

    res.status(200).send();
  } catch (error) {
    console.error('Interactive handling error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Function to open email generation modal
async function openEmailGenerationModal(triggerId, channelId) {
  await slackClient.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'email_modal',
      title: { type: 'plain_text', text: 'Generate Email' },
      submit: { type: 'plain_text', text: 'Generate' },
      blocks: [
        {
          type: 'input',
          block_id: 'email_input',
          element: {
            type: 'plain_text_input',
            action_id: 'email_text',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Describe the email you want to generate...',
            },
          },
          label: { type: 'plain_text', text: 'Email Description' },
        }
      ],
      private_metadata: channelId,
    },
  });
}

// Updated sendMessage function to use initial message format
exports.sendMessage = async (req, res) => {
  try {
    const { emailsData } = req.body;
    if (!CHANNEL_ID) {
      return res.status(400).json({ 
        error: 'Slack channel not initialized. Call /initialize first.' 
      });
    }
    emails = emailsData; // Store emails for later use
    const text = await summarizeAllEmails(emailsData);
    const response = await sendInitialMessage(CHANNEL_ID, text);
    res.json({ 
      success: true, 
      messageTs: response.ts,
      channelId: CHANNEL_ID 
    });
  } catch (error) {
    console.error('Message sending error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to find message ID based on subject
function findMessageId(subject, email = null, containsSubject = false) {
  console.log("Email and subject of selected content");
  console.log(email, subject);
  
  try {
    let matchingEmails = emails;
    
    if (containsSubject) {
      matchingEmails = matchingEmails.filter(emailData => 
        emailData.subject.toLowerCase().includes(subject.toLowerCase())
      );
    } else {
      matchingEmails = matchingEmails.filter(emailData => 
        emailData.subject.toLowerCase() === subject.toLowerCase()
      );
    }
    
    if (matchingEmails.length > 0) {
      return matchingEmails[0].id;
    }
    
    console.log("No emails found matching the specified criteria");
    return null;
  } catch (error) {
    console.error(`Error finding matching email: ${error}`);
    return null;
  }
}

// Function to handle approval after subject selection
async function handleApproval(userId, channelId, messageTs, originalText, emailId, subject) {
  console.log("in approval");
  try {
    console.log(`Processing approval from user ${userId}`);

    // Update the original message with approval status
    const updatedText = `${originalText}\n\n:white_check_mark: *Approved* by <@${userId}>`;
    const response = await slackClient.chat.update({
      channel: channelId,
      ts: messageTs,
      text: updatedText,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: updatedText
          }
        }
      ]
    });
    console.log("Message updated successfully:", response);
    // Send confirmation message in thread
    const threadResponse = await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `Request approved by <@${userId}>`
    });
    console.log("Thread message sent:", threadResponse);

    // Handle email sending in your email service
    // Note: You'll need to implement this part based on your email service
    // This is where you'd call your email service with generatedEmail content
    try {
      // This is a placeholder - implement your email sending logic here
      const messageId = findMessageId(subject);
      console.log("message_id");
      console.log(messageId);
      
      if (messageId) {
        // Call your email service here
        // Example:
        // await emailService.sendReply({
        //   messageId: messageId,
        //   content: generatedEmail,
        //   subject: subject
        // });
        
        await slackClient.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: "✅ Email sent successfully!"
        });
      } else {
        await slackClient.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: "❌ Error: Could not find original email thread"
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      await slackClient.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `❌ Error: ${error.message}`
      });
    }

  } catch (error) {
    console.error("Error in approval handler:", error);
    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `❌ Error: ${error.message}`
    });
  }
}

async function handleModalSubmission(payload) {
  console.log(payload);
  const { view, user } = payload;
  console.log(view);
  const viewId = view.callback_id;
  switch (viewId) {
    case 'email_modal':
      const emailText = view.state.values.email_input.email_text.value;
      const channelId = view.private_metadata;
      
      // Generate email using your AI service
      try {
        // This is a placeholder - implement your email generation logic
         const generatedEmailContent = await generateEmail(emailText, emails,name);
        generatedEmail = generatedEmailContent; // Store for later use
        
        if (generatedEmailContent) {
          await sendMessageWithApprovalButtons(channelId, generatedEmailContent);
        } else {
          await slackClient.chat.postMessage({
            channel: channelId,
            text: "❌ Error generating email. Please try again."
          });
        }
      } catch (error) {
        console.error("Error generating email:", error);
      }
      break;

    case 'edit_manual_modal':
      const metadata = JSON.parse(view.private_metadata);
      const editedText = view.state.values.manual_edit.edited_text.value;
      generatedEmail = editedText; // Store edited content
      await updateMessage(metadata.channelId, metadata.messageTs, editedText);
      break;

    case 'edit_ai_modal':
      const aiMetadata = JSON.parse(view.private_metadata);
      const instructions = view.state.values.edit_instructions.instruction_text.value;
      
      try {
        // This is a placeholder - implement your AI editing logic
        // const editedContent = await generateEmail(
        //   `Edit the following email according to these instructions: ${instructions}\n\nOriginal email:\n${aiMetadata.originalText}`,
        //   emails
        // );
        const editedContent = "Sample AI edited content";
        generatedEmail = editedContent; // Store edited content
        
        if (editedContent) {
          await updateMessage(aiMetadata.channelId, aiMetadata.messageTs, editedContent);
        } else {
          await slackClient.chat.postMessage({
            channel: aiMetadata.channelId,
            thread_ts: aiMetadata.messageTs,
            text: "❌ Error editing with AI. Please try again."
          });
        }
      } catch (error) {
        console.error("Error in AI editing:", error);
      }
      break;

    case 'subject_selection_modal':
      const selectionMetadata = JSON.parse(view.private_metadata);
      const selectedOption = view.state.values.email_subject.subject_selected.selected_option;
      await handleApproval(
        user.id,
        selectionMetadata.channelId,
        selectionMetadata.messageTs,
        selectionMetadata.originalText,
        selectedOption.value,
        selectedOption.text.text
      );
      break;
  }
}

async function updateMessage(channelId, messageTs, text) {
  generatedEmail = text; // Store the updated content
  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve' },
          style: 'primary',
          action_id: 'approve_email'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Edit with AI' },
          style: 'primary',
          action_id: 'edit_with_ai'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Edit Myself' },
          style: 'primary',
          action_id: 'edit_myself'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reject' },
          style: 'danger',
          action_id: 'reject_email'
        }
      ]
    }
  ];

  await slackClient.chat.update({
    channel: channelId,
    ts: messageTs,
    blocks,
    text
  });
}
