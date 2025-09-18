const apiClient = require('../utils/apiClient');

/**
 * Object containing mood-specific FAQs
 */
const moodFAQs = {
  happy: [
    "How can I sustain this positive feeling?",
    "What activities can boost my happiness further?",
    "How can I share my positive energy with others?",
    "Can journaling help maintain my positive mood?",
    "What are some gratitude practices I can try?"
  ],
  sad: [
    "What are some healthy ways to process sadness?",
    "How can I practice self-care when feeling down?",
    "When should I consider seeking professional help?",
    "What small steps can I take to feel better?",
    "How can I express my feelings constructively?"
  ],
  frustrated: [
    "How can I reduce stress quickly?",
    "What techniques help manage overwhelming feelings?",
    "How can I improve my focus when frustrated?",
    "What's a good way to reset my mindset?",
    "How can I communicate when I'm feeling frustrated?"
  ],
  study: [
    "What's the most effective study technique?",
    "How can I retain information better?",
    "What's the ideal study session length?",
    "How do I create an effective study schedule?",
    "What foods help with concentration and focus?"
  ]
};

/**
 * Handle chat requests based on mood
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.moodChat = async (req, res) => {
  const { mood } = req.params;
  const { message, userId } = req.body;

  // Validate inputs
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!['happy', 'sad', 'frustrated', 'study'].includes(mood)) {
    return res.status(400).json({ error: 'Invalid mood type' });
  }

  try {
    // Start requests in parallel for better performance
    const botMessagePromise = apiClient.getChatResponse(mood, message);
    const quotePromise = apiClient.getRandomQuote();
    
    // Wait for both to complete
    const [botMessage, quoteData] = await Promise.all([botMessagePromise, quotePromise]);
    
    // Format quote if available
    let quote = "Enjoy the present moment.";
    if (quoteData && quoteData.q && quoteData.a) {
      quote = quoteData.q + ' - ' + quoteData.a;
    }

    // Return response with FAQs for the specific mood
    res.json({
      botMessage,
      quote,
      faq: moodFAQs[mood] || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Return a fallback response if the API fails
    const fallbackMessages = {
      happy: "I'm glad you're feeling positive! Keep embracing those good feelings.",
      sad: "I'm sorry to hear you're feeling down. Remember to be gentle with yourself.",
      frustrated: "It sounds like you're dealing with some frustration. Taking a short break might help clear your mind.",
      study: "Focus on one small task at a time, and remember to take breaks."
    };
    
    res.json({
      botMessage: fallbackMessages[mood] || "I'm here to chat with you. What's on your mind?",
      quote: "The best way out is always through. - Robert Frost",
      faq: moodFAQs[mood] || [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get all mood FAQs
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMoodFAQs = async (req, res) => {
  try {
    res.json({ moodFAQs });
  } catch (error) {
    console.error('Failed to get mood FAQs:', error);
    res.status(500).json({ error: 'Failed to get mood FAQs' });
  }
};