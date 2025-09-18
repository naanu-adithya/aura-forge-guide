# EchoOrb API Integration Guide

This guide provides information on how to test and use the AI integration in EchoOrb.

## Setup

1. Clone the repository
2. Navigate to the backend directory
3. Create a `.env` file based on `.env.example`
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

## API Status

Before using any features, check if the API integration is working:

```
GET http://localhost:5000/api/status
```

This will return the status of all connected services including the Hugging Face API.

## Test Endpoints

Use these endpoints to test specific functionality:

### Chat Test
```
GET http://localhost:5000/api/status/test/chat
```

### Sentiment Analysis Test
```
GET http://localhost:5000/api/status/test/sentiment
```

### Text Summarization Test
```
GET http://localhost:5000/api/status/test/summary
```

### Emotion Analysis Test
```
GET http://localhost:5000/api/status/test/emotions
```

### Journal Prompts Test
```
GET http://localhost:5000/api/status/test/prompts
```

## Main API Endpoints

### Chat API

Send a message to the chatbot:
```
POST http://localhost:5000/api/chat/mood/:mood
```

Parameters:
- `:mood` - Mood type (happy, sad, frustrated, study)
- Body: `{ "message": "Your message here", "userId": "optional-user-id" }`

Example response:
```json
{
  "botMessage": "I'm glad to hear you're feeling happy! To maintain this positive feeling...",
  "quote": "Happiness is not something ready-made. It comes from your own actions. - Dalai Lama",
  "faq": ["How can I sustain this positive feeling?", "What activities can boost my happiness further?", "..."]
}
```

### Journal Analysis API

Analyze a journal entry:
```
POST http://localhost:5000/api/journal/analyze
```

Parameters:
- Body: `{ "content": "Your journal content here" }` or `{ "journalId": "existing-journal-id" }`

Example response:
```json
{
  "sentiment": "positive",
  "sentimentScore": 0.92,
  "keywords": ["happy", "achieved", "productive", "family", "success"],
  "recommendations": [
    "Channel this positive energy into a creative project",
    "Share your positivity with someone who might need it",
    "..."
  ]
}
```

## API Clients

### Using with JavaScript/Fetch
```javascript
// Example: Chat with the API
async function sendChat(mood, message) {
  const response = await fetch(`http://localhost:5000/api/chat/mood/${mood}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  });
  
  return await response.json();
}

// Example: Analyze journal entry
async function analyzeJournal(content) {
  const response = await fetch('http://localhost:5000/api/journal/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  
  return await response.json();
}
```

## Live API Test Links

Once your server is running, you can test it with these links:

1. API Status: [http://localhost:5001/api/status](http://localhost:5001/api/status)
2. Chat Test: [http://localhost:5001/api/status/test/chat](http://localhost:5001/api/status/test/chat)
3. Sentiment Test: [http://localhost:5001/api/status/test/sentiment](http://localhost:5001/api/status/test/sentiment)
4. Emotions Test: [http://localhost:5001/api/status/test/emotions](http://localhost:5001/api/status/test/emotions)
5. Journal Prompts Test: [http://localhost:5001/api/status/test/prompts](http://localhost:5001/api/status/test/prompts)

## Notes

- Hugging Face API has rate limits for free users. If you hit the rate limit, wait a few minutes and try again.
- For production use, consider getting a paid API key or implementing a caching strategy.
- Model loading might take a few seconds on first request.