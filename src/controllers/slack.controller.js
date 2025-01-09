const { WebClient } = require('@slack/web-api');
const User=require("../models/user.model");
const { summarizeAllEmails } = require('./ai.controller');
let slackClient;
let emails = [];
let generatedEmail = '';
let CHANNEL_ID = null;

const initializeSlackClient = (token, channelId) => {
  slackClient = new WebClient(token);
  CHANNEL_ID = channelId;
};

exports.initialize = async (req, res) => {
  try {
    const { slackToken, channelId, gmailCredentials } = req.body;
    if (!slackToken || !channelId) {
      return res.status(400).json({ 
        error: 'Both slackToken and channelId are required' 
      });
    }
    initializeSlackClient(slackToken, channelId)
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
    console.log("intialized")
  } catch (error) {
    console.error('Initialization error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.handleInteractive = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, user, channel, trigger_id } = payload;
    if (type === 'block_actions') {
      const action = payload.actions[0];
      const messageTs = payload.message.ts;
      const originalText = payload.message.blocks[0].text.text;
      switch (action.action_id) {
        case 'start_chat_button':
          await handleStartChat(trigger_id, channel.id);
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

exports.sendMessage = async (req, res) => {
  try {
    const { emailsData } = req.body;
    if (!CHANNEL_ID) {
      return res.status(400).json({ 
        error: 'Slack channel not initialized. Call /initialize first.' 
      });
    }
    const text= await summarizeAllEmails(emailsData);
    const response = await sendMessageWithApprovalButtons(CHANNEL_ID, text);
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
exports.getChannelInfo = async (req, res) => {
  try {
    if (!CHANNEL_ID) {
      return res.status(400).json({ 
        error: 'Slack channel not initialized. Call /initialize first.' 
      });
    }
    const result = await slackClient.conversations.info({
      channel: CHANNEL_ID
    });
    res.json({
      success: true,
      channel: result.channel
    });
  } catch (error) {
    console.error('Channel info error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Helper functions
async function sendMessageWithApprovalButtons(channelId, text) {
  try {
    const message = {
      channel: channelId,
      text: text || "New message", // Fallback text
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text || "New message" // This was the issue - needs proper text field
          }
        },
        {
          type: "actions",
          block_id: "approval_actions",
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

    // Ensure text is not undefined or null before sending
    if (!text) {
      throw new Error('Text parameter is required');
    }
    return await slackClient.chat.postMessage(message);
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}
async function handleStartChat(triggerId, channelId) {
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

async function handleApprovalSelection(triggerId, channelId, messageTs, originalText) {
  const emailOptions = emails.map(email => ({
    text: {
      type: 'plain_text',
      text: email.subject?.slice(0, 75) + '...' || 'No subject',
    },
    value: email.id
  }));

  await slackClient.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'subject_selection_modal',
      title: { type: 'plain_text', text: 'Select Email Thread' },
      submit: { type: 'plain_text', text: 'Approve' },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Please select the email thread you want to approve:',
          },
        },
        {
          type: 'input',
          block_id: 'email_subject',
          element: {
            type: 'static_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select an email thread',
            },
            options: emailOptions,
            action_id: 'subject_selected',
          },
          label: { type: 'plain_text', text: 'Email Thread' },
        },
      ],
      private_metadata: JSON.stringify({
        channelId,
        messageTs,
        originalText,
      }),
    },
  });
}

async function handleManualEdit(triggerId, channelId, messageTs, originalText) {
  await slackClient.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'edit_manual_modal',
      title: { type: 'plain_text', text: 'Edit Message' },
      submit: { type: 'plain_text', text: 'Update' },
      blocks: [
        {
          type: 'input',
          block_id: 'manual_edit',
          element: {
            type: 'plain_text_input',
            action_id: 'edited_text',
            multiline: true,
            initial_value: originalText,
          },
          label: { type: 'plain_text', text: 'Edit Message' },
        }
      ],
      private_metadata: JSON.stringify({
        channelId,
        messageTs,
      }),
    },
  });
}

async function handleAIEdit(triggerId, channelId, messageTs, originalText) {
  await slackClient.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: 'edit_ai_modal',
      title: { type: 'plain_text', text: 'Edit with AI' },
      submit: { type: 'plain_text', text: 'Update' },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Original Message:*\n' + originalText,
          },
        },
        {
          type: 'input',
          block_id: 'edit_instructions',
          element: {
            type: 'plain_text_input',
            action_id: 'instruction_text',
            multiline: true,
            placeholder: {
              type: 'plain_text',
              text: 'Provide instructions for AI editing...',
            },
          },
          label: { type: 'plain_text', text: 'Editing Instructions' },
        },
      ],
      private_metadata: JSON.stringify({
        channelId,
        messageTs,
        originalText,
      }),
    },
  });
}

async function handleRejection(userId, channelId, messageTs, originalText) {
  const updatedText = `${originalText}\n\n:x: *Rejected* by <@${userId}>`;
  
  await slackClient.chat.update({
    channel: channelId,
    ts: messageTs,
    text: updatedText,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: updatedText } }],
  });

  await slackClient.chat.postMessage({
    channel: channelId,
    thread_ts: messageTs,
    text: `Request rejected by <@${userId}>`,
  });
}

async function handleModalSubmission(payload) {
  const { view, user } = payload;
  const viewId = view.callback_id;
  const metadata = JSON.parse(view.private_metadata);

  switch (viewId) {
    case 'edit_manual_modal':
      const editedText = view.state.values.manual_edit.edited_text.value;
      await updateMessage(metadata.channelId, metadata.messageTs, editedText);
      break;

    case 'edit_ai_modal':
      // You can call your existing AI service here
      break;

    case 'subject_selection_modal':
      const selectedEmail = view.state.values.email_subject.subject_selected.selected_option;
      await handleApproval(
        user.id,
        metadata.channelId,
        metadata.messageTs,
        metadata.originalText,
        selectedEmail.value,
        selectedEmail.text.text
      );
      break;
  }
}

async function updateMessage(channelId, messageTs, text) {
  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve' },
          style: 'primary',
          action_id: 'approve_email',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Edit with AI' },
          style: 'primary',
          action_id: 'edit_with_ai',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Edit Myself' },
          style: 'primary',
          action_id: 'edit_myself',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Reject' },
          style: 'danger',
          action_id: 'reject_email',
        },
      ],
    },
  ];

  await slackClient.chat.update({
    channel: channelId,
    ts: messageTs,
    blocks,
    text,
  });
}