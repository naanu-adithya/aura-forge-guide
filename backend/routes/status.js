const express = require('express');
const router = express.Router();
const apiClient = require('../utils/apiClient');

/**
 * @route   GET /api/status
 * @desc    Check API services status
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    // Check Google Gemini API status
    const geminiStatus = await apiClient.checkStatus();
    
    // Check if we have an API token
    const hasToken = !!process.env.GEMINI_API_KEY;
    
    res.json({
      geminiApi: geminiStatus,
      config: {
        hasToken,
        defaultModel: apiClient.defaultModel,
        flashModel: apiClient.flashModel
      },
      server: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/status/test/:type
 * @desc    Test specific API functionality
 * @access  Public
 */
router.get('/test/:type', async (req, res) => {
  const { type } = req.params;
  const validTests = ['chat', 'sentiment', 'summary', 'emotions', 'prompts'];
  
  if (!validTests.includes(type)) {
    return res.status(400).json({ 
      error: `Invalid test type. Valid types are: ${validTests.join(', ')}` 
    });
  }
  
  try {
    let result;
    const testText = "I had a great day today. The weather was beautiful and I accomplished all my tasks.";
    
    switch (type) {
      case 'chat':
        result = await apiClient.getChatResponse('happy', 'How can I maintain this positive feeling?');
        break;
      case 'sentiment':
        result = await apiClient.analyzeSentiment(testText);
        break;
      case 'summary':
        result = await apiClient.generateSummary(testText + " " + testText.repeat(5));
        break;
      case 'emotions':
        result = await apiClient.analyzeEmotions(testText);
        break;
      case 'prompts':
        result = await apiClient.getJournalPrompts('happy');
        break;
    }
    
    res.json({
      type,
      status: 'success',
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      type,
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;