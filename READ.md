# Pixolabs Backend

This is the backend server for the Pixolabs application, which handles email management with Gmail integration and AI-powered features.

## Features

- Gmail Authentication
- Email Management (read, send, reply)
- AI-powered email generation and editing
- Email summaries generation
- Secure user authentication with JWT

## Prerequisites

Before running this project, make sure you have:

1. Node.js installed (version 14 or higher)
2. MongoDB installed and running
3. Google Cloud Platform account with Gmail API enabled
4. OpenAI API key

## Project Structure

### Core Files

- `src/index.js`: Main application file that sets up the Express server, middleware, and database connection
- `package.json`: Contains project dependencies and scripts

### Configuration Files

- `src/config/config.js`: Contains all configuration settings including MongoDB, Google OAuth, and OpenAI API settings
- `src/config/db.js`: Handles MongoDB connection setup
- `src/config/gmail.js`: Sets up Google OAuth client for Gmail integration

### Models

The project uses MongoDB for data storage, and these models define the structure of the data:

1. `src/models/user.model.js` (User Model):
   ```javascript
   {
     googleId: String,       // The unique ID from Google account
     email: String,         // User's email address
     name: String,         // User's full name
     tokens: {
       access_token: String,    // Google OAuth access token
       refresh_token: String,   // Google OAuth refresh token
       expiry_date: Number     // When the tokens expire
     },
     lastLogin: Date       // When the user last logged in
   }
   ```
   - This model keeps track of user information
   - The `googleId` helps identify users who log in with Google
   - `tokens` store Google authentication data
   - Has a special function `areTokensExpired()` to check if Google tokens need renewal
   - Records when users were created and last updated

2. `src/models/email.model.js` (Email Model):
   ```javascript
   {
     userId: ObjectId,      // Links to the User who owns this email
     messageId: String,     // Gmail's unique ID for this email
     threadId: String,      // Gmail's ID for the email conversation
     subject: String,       // Email subject line
     from: String,         // Sender's email address
     to: String,          // Recipient's email address
     content: String,     // Original email content
     generatedContent: String,  // AI-generated content if any
     status: String       // Can be: draft, sent, approved, or rejected
   }
   ```
   - Stores information about individual emails
   - Keeps track of both original and AI-generated content
   - Links each email to its owner (userId)
   - Tracks the email's status throughout its lifecycle
   - Records when emails were created and modified

3. `src/models/emailTemplate.model.js` (Email Template Model):
   ```javascript
   {
     userId: ObjectId,     // Links to the User who owns this template
     name: String,        // Template name for easy reference
     subject: String,     // Default subject line
     content: String,     // Template content
     tags: [String],     // Labels to organize templates
     usageCount: Number  // How many times template was used
   }
   ```
   - Stores reusable email templates
   - Makes it easy to send similar emails repeatedly
   - Tracks how often each template is used
   - Allows organizing templates with tags
   - Records when templates were created and last updated

All models include automatic timestamps (`createdAt` and `updatedAt`) to track when records are created and modified.

### Routes

1. `src/routes/auth.routes.js`:
   - `/api/auth/gmail`: Initiates Gmail authentication
   - `/api/auth/gmail/callback`: Handles OAuth callback
   - `/api/auth/logout`: Handles user logout

2. `src/routes/email.routes.js`:
   - `/api/emails/list`: Get list of emails
   - `/api/emails/summaries`: Get AI-generated email summaries
   - `/api/emails/:emailId`: Get specific email content
   - `/api/emails/send`: Send new email
   - `/api/emails/reply/:emailId`: Reply to an email
   - `/api/emails/generate`: Generate AI email reply
   - `/api/emails/edit`: Edit email with AI

3. `src/routes/ai.routes.js`:
   - `/api/ai/generate`: Generate new email using AI
   - `/api/ai/edit`: Edit existing email using AI

### Controllers

1. `src/controllers/auth.controller.js`:
   - Handles Gmail authentication flow
   - Manages user sessions and JWT tokens
   - Handles user logout

2. `src/controllers/email.controller.js`:
   - Manages email operations (list, read, send, reply)
   - Integrates with Gmail API
   - Handles email content processing
   - Manages AI-powered email features

3. `src/controllers/ai.controller.js`:
   - Handles AI-powered email generation
   - Manages email editing with AI
   - Generates email summaries

### Middleware

1. `src/middleware/auth.js`:
   - Validates JWT tokens
   - Ensures user authentication
   - Protects private routes

2. `src/middleware/errorHandler.js`:
   - Handles various types of errors
   - Provides appropriate error responses
   - Includes validation and authentication error handling

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret
   ```

4. Start the development server:
   ```bash
   npm start
   ```

## API Security

- All routes except authentication endpoints require JWT token
- Tokens must be included in requests as Bearer token in Authorization header
- Tokens expire after 84 hours
- User sessions are managed securely with JWT

## Error Handling

The application includes comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Not found errors (404)
- Server errors (500)

All errors are logged and returned with appropriate messages based on the environment (development/production).

## Gmail Integration

The application uses Gmail API for:
- Reading emails
- Sending emails
- Managing email threads
- Accessing user email content

## AI Features

Powered by OpenAI's GPT models, the application provides:
- Email generation based on prompts
- Email editing and refinement
- Email summarization
- Professional email reply generation

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License.