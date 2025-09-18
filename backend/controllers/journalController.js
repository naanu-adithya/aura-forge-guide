const Journal = require('../models/Journal');
const { encryptText, decryptText } = require('../utils/encryption');
const apiClient = require('../utils/apiClient');

/**
 * Save a new journal entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createJournal = async (req, res) => {
  const { userId, content, mood } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Journal content is required' });
  }

  try {
    // Encrypt the journal content
    const encryptedContent = encryptText(content);

    // Create a new journal entry
    const newJournal = new Journal({
      userId,
      content: content.substring(0, 200) + '...', // Only store a preview in plain text
      encryptedContent,
      mood: mood || 'neutral'
    });

    // Save the journal entry
    const savedJournal = await newJournal.save();

    res.status(201).json({
      message: 'Journal entry created successfully',
      journalId: savedJournal._id
    });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
};

/**
 * Get all journal entries for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getJournals = async (req, res) => {
  const { userId } = req.params;

  try {
    const journals = await Journal.find({ userId })
      .sort({ createdAt: -1 }) // Sort by creation date in descending order
      .select('-encryptedContent'); // Don't send encrypted content

    res.json(journals);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
};

/**
 * Get a single journal entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getJournal = async (req, res) => {
  const { journalId } = req.params;

  try {
    const journal = await Journal.findById(journalId);

    if (!journal) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Decrypt the journal content
    const decryptedContent = decryptText(journal.encryptedContent);

    // Return the journal with decrypted content
    res.json({
      ...journal.toObject(),
      content: decryptedContent,
      encryptedContent: undefined // Don't send encrypted content
    });
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    res.status(500).json({ error: 'Failed to fetch journal entry' });
  }
};

/**
 * Analyze a journal entry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzeJournal = async (req, res) => {
  const { journalId, content } = req.body;

  if (!journalId && !content) {
    return res.status(400).json({ error: 'Either journalId or content is required' });
  }

  try {
    let textToAnalyze;

    if (journalId) {
      // Get the journal entry from the database
      const journal = await Journal.findById(journalId);

      if (!journal) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      // Decrypt the journal content
      textToAnalyze = decryptText(journal.encryptedContent);
    } else {
      textToAnalyze = content;
    }

    // Execute analysis calls in parallel for better performance
    const [sentimentResult, emotionsResult, journalPrompts] = await Promise.all([
      apiClient.analyzeSentiment(textToAnalyze),
      apiClient.analyzeEmotions(textToAnalyze),
      apiClient.getJournalPrompts('reflection')
    ]);
    
    // Process sentiment
    let sentiment = 'neutral';
    if (sentimentResult.label === 'POSITIVE' && sentimentResult.score > 0.6) {
      sentiment = 'positive';
    } else if (sentimentResult.label === 'NEGATIVE' && sentimentResult.score > 0.6) {
      sentiment = 'negative';
    }

    // Extract keywords using both simple frequency and emotions analysis
    const words = textToAnalyze.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordFrequency = {};
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'what', 'about', 'like', 
                       'also', 'been', 'were', 'would', 'should', 'could', 'there', 'their',
                       'then', 'than', 'when', 'some', 'very', 'really', 'just'];
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });

    // Sort by frequency and get top keywords
    const frequencyKeywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    // Combine with emotional keywords
    const emotionWords = emotionsResult.emotions.map(e => e.emotion).filter(e => !stopWords.includes(e));
    
    // Create final keywords list with no duplicates
    const keywords = Array.from(new Set([...frequencyKeywords, ...emotionWords])).slice(0, 7);

    // Generate personalized recommendations based on sentiment and emotions
    let recommendations = [];
    const dominantEmotion = emotionsResult.dominant || 'neutral';
    
    if (sentiment === 'negative') {
      if (dominantEmotion === 'anger' || dominantEmotion === 'annoyance') {
        recommendations = [
          "Consider a physical outlet for frustration like exercise",
          "Practice deep breathing when you feel anger rising",
          "Write a letter expressing your feelings (you don't have to send it)",
          "Take a short break from the situation if possible"
        ];
      } else if (dominantEmotion === 'sadness' || dominantEmotion === 'disappointment') {
        recommendations = [
          "Be gentle with yourself during this difficult time",
          "Connect with someone supportive who can listen",
          "Engage in a small self-care activity today",
          "Remember that feelings are temporary, even when intense"
        ];
      } else if (dominantEmotion === 'anxiety' || dominantEmotion === 'fear') {
        recommendations = [
          "Try grounding techniques like the 5-4-3-2-1 method",
          "Focus on what you can control, not what you can't",
          "Break overwhelming tasks into small, manageable steps",
          "Practice progressive muscle relaxation before bed"
        ];
      } else {
        recommendations = [
          "Consider practicing mindfulness or meditation",
          "Try a physical activity to boost your mood",
          "Connect with a supportive friend or family member",
          "List three things you are grateful for today"
        ];
      }
    } else if (sentiment === 'positive') {
      recommendations = [
        "Channel this positive energy into a creative project",
        "Share your positivity with someone who might need it",
        "Journal about what contributed to these positive feelings",
        "Build on this momentum to tackle a challenging task"
      ];
    } else {
      recommendations = [
        "Reflect on your emotions more deeply in your next journal",
        "Try a new activity that brings you joy",
        "Set a small goal for tomorrow",
        "Consider what might elevate your mood further"
      ];
    }
    
    // Add journal prompts from the API to recommendations
    if (journalPrompts && journalPrompts.length > 0) {
      recommendations = [...recommendations, ...journalPrompts];
    }

    // Update the journal entry with analysis results if journalId is provided
    if (journalId) {
      await Journal.findByIdAndUpdate(journalId, {
        sentiment,
        keywords
      });
    }

    res.json({
      sentiment,
      sentimentScore: sentimentResult.score,
      emotions: emotionsResult.emotions,
      dominantEmotion: emotionsResult.dominant,
      keywords,
      recommendations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing journal entry:', error);
    res.status(500).json({ error: 'Failed to analyze journal entry' });
  }
};