const axios = require('axios');
// Import the new Gemini API client
const { GoogleGenAI } = require('@google/genai');

/**
 * Client for Google Gemini API
 */
class ApiClient {
  constructor() {
    this.zenQuotesUrl = 'https://zenquotes.io/api/';
    this.defaultModel = 'gemini-2.5-flash-lite'; // Updated model for most tasks
    this.flashModel = 'gemini-2.5-flash-lite'; // Using the lite model for faster responses
    
    // Hardcoded API key as requested
    const GEMINI_API_KEY = "AIzaSyCyzERf4QyENEF-JiVNtYZZKCfTtmrR4Ck";
    
    // Initialize Google Gemini client using the new @google/genai package
    try {
      // Initialize client with hardcoded API key
      this.genAI = new GoogleGenAI({
        apiKey: GEMINI_API_KEY
      });
      
      console.log('Google Gemini API client initialized successfully');
    } catch (error) {
      console.warn('Warning: Failed to initialize Google Gemini API client. ', error.message);
    }
  }

  /**
   * Call the Google Gemini API
   * @param {string} modelName - 'pro' or 'flash'
   * @param {string} prompt - The prompt to send to the model
   * @param {Object} options - Additional options for the API
   * @returns {Promise<Object>} - API response
   */
  async callGeminiAPI(modelName = 'pro', prompt, options = {}) {
    try {
      if (!this.genAI) {
        throw new Error('Google Gemini API client not initialized.');
      }
      
      // Determine which model to use based on the modelName
      const modelId = modelName === 'flash' ? this.flashModel : this.defaultModel;
      
      // Configure generation settings
      const generationConfig = {
        maxTokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.95,
        ...options.generationConfig
      };
      
      // Call the API using the new @google/genai package
      const response = await this.genAI.models.generateContent({
        model: modelId,
        contents: prompt,
        generationConfig
      });
      
      // Extract text from response
      return {
        text: response.text,
        raw: response
      };
    } catch (error) {
      console.error('Google Gemini API error:', error.message);
      
      // Check if this is a rate limit error
      if (error.message?.includes('quota') || error.message?.includes('rate')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`Google Gemini API error: ${error.message}`);
    }
  }

  /**
   * Get a random quote from ZenQuotes API
   * @returns {Promise<Object>} - Quote object
   */
  async getRandomQuote() {
    try {
      const response = await axios.get(`${this.zenQuotesUrl}random`);
      return response.data[0];
    } catch (error) {
      console.error('ZenQuotes API error:', error.response?.data || error.message);
      throw new Error(`ZenQuotes API error: ${error.message}`);
    }
  }

  /**
   * Get chat completion based on mood
   * @param {string} mood - User's mood
   * @param {string} message - User's message
   * @returns {Promise<string>} - Bot response
   */
  async getChatResponse(mood, message) {
    // Define system prompts for different moods
    const systemPrompts = {
      happy: "You are an enthusiastic chatbot that celebrates achievements and amplifies positive emotions. Be cheerful, congratulatory, and help users maintain their positive state.",
      sad: "You are an empathetic chatbot specializing in supporting people through sadness or depression. Respond with warmth, validation, and gentle encouragement. Never be dismissive of feelings.",
      frustrated: "You are a calm, patient chatbot that helps users manage frustration and stress. Provide practical strategies for regaining focus and perspective.",
      study: "You are a focused study assistant chatbot. Help users understand complex topics, plan study sessions, and provide clear explanations. Be concise and educational."
    };

    const systemPrompt = systemPrompts[mood] || "You are a helpful and supportive chatbot.";
    
    try {
      // Build full prompt with mood-specific instructions
      const fullPrompt = `${systemPrompt}

User message: ${message}

Remember to respond in a way that's appropriate for someone feeling ${mood || "neutral"}. Keep your response concise (maximum 4 sentences) and focused on addressing the user's needs directly.`;
      
      // Call the API with the flash model for chat responses (faster response time)
      const response = await this.callGeminiAPI('flash', fullPrompt, {
        temperature: 0.7,
        maxTokens: 250,
        topP: 0.95
      });
      
      if (response && response.text) {
        return response.text.trim();
      }
      
      throw new Error('Empty response from API');
    } catch (error) {
      console.error('Chat response error:', error);
      
      // Provide a fallback response based on mood
      const fallbackResponses = {
        happy: "I'm glad you're feeling positive! Keep embracing those good feelings. What specifically made you happy today?",
        sad: "I'm sorry to hear you're feeling down. Remember to be gentle with yourself during difficult times. Would it help to talk more about what's bothering you?",
        frustrated: "It sounds like you're dealing with some frustration. Taking a deep breath and a short break might help clear your mind. What's causing the frustration?",
        study: "For effective studying, try breaking your work into smaller, manageable chunks. What subject are you focusing on right now?"
      };
      
      return fallbackResponses[mood] || "I apologize, but I'm unable to process your request at the moment. Please try again later.";
    }
  }

  /**
   * Analyze sentiment of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Sentiment analysis result
   */
  async analyzeSentiment(text) {
    try {
      // Truncate text if too long
      const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;
      
      // Create a specific prompt for sentiment analysis
      const prompt = `Analyze the sentiment of the following text and respond with EXACTLY ONE WORD: either "POSITIVE", "NEGATIVE", or "NEUTRAL". 
Also include a confidence score between 0 and 1 (e.g., 0.8) on the next line. 
Here is the text to analyze: "${truncatedText}"`;
      
      // Use the flash model for sentiment analysis (faster)
      const response = await this.callGeminiAPI('flash', prompt);
      
      // Parse the response - expecting format like:
      // POSITIVE
      // 0.85
      if (response && response.text) {
        const lines = response.text.trim().split('\n');
        const sentiment = lines[0].trim().toUpperCase();
        
        // Extract score (if available)
        let score = 0.5; // Default
        if (lines.length > 1) {
          const scoreMatch = lines[1].match(/([0-9]\.[0-9]+)/);
          if (scoreMatch) {
            score = parseFloat(scoreMatch[0]);
          }
        }
        
        // Validate the sentiment label
        const label = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'].includes(sentiment) 
          ? sentiment 
          : 'NEUTRAL';
        
        return {
          label,
          score: Math.min(1, Math.max(0, score)) // Ensure score is between 0 and 1
        };
      }
      
      // If parsing fails, return a neutral sentiment
      return { label: 'NEUTRAL', score: 0.5 };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      // Provide a default response if the API call fails
      return { label: 'NEUTRAL', score: 0.5 };
    }
  }

  /**
   * Generate text summary
   * @param {string} text - Text to summarize
   * @returns {Promise<string>} - Generated summary
   */
  async generateSummary(text) {
    try {
      // Truncate text if it's too long
      const truncatedText = text.length > 10000 ? text.substring(0, 10000) : text;
      
      const prompt = `Please provide a concise summary of the following text in 2-3 paragraphs:

${truncatedText}

Summary:`;
      
      // Use the pro model for summarization (better quality)
      const response = await this.callGeminiAPI('pro', prompt, {
        maxTokens: 500,
        temperature: 0.4  // Lower temperature for more focused summaries
      });

      if (response && response.text) {
        return response.text.trim();
      }
      
      throw new Error('Empty response from API');
    } catch (error) {
      console.error('Summary generation error:', error);
      
      // If the summary fails, try with a shorter chunk of text
      try {
        // Try with just the first part of the text
        const shortenedText = text.length > 2000 ? text.substring(0, 2000) : text;
        
        const shorterPrompt = `Summarize the following text in a brief paragraph:

${shortenedText}

Summary:`;
        
        const fallbackResponse = await this.callGeminiAPI('flash', shorterPrompt, {
          maxTokens: 250,
          temperature: 0.3
        });
        
        if (fallbackResponse && fallbackResponse.text) {
          return fallbackResponse.text.trim();
        }
      } catch (fallbackError) {
        console.error('Fallback summarization failed:', fallbackError.message);
      }
      
      return 'Summary could not be generated due to an API error.';
    }
  }

  /**
   * Generate quiz questions from text
   * @param {string} text - Source text
   * @param {number} numQuestions - Number of questions to generate
   * @returns {Promise<Array>} - Array of quiz questions
   */
  async generateQuizQuestions(text, numQuestions = 3) {
    try {
      // Limit the text length to avoid token limits
      const truncatedText = text.length > 2000 ? text.substring(0, 2000) : text;
      
      // Create prompt for Gemini
      const prompt = `You are a helpful assistant that creates educational quiz questions. Generate exactly 3 multiple-choice questions with 4 options each, using the provided text as the source material. Format each question as follows:

Q1: [Question text]?
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Correct letter]

Here is the source text to base questions on:
${truncatedText}`;

      // Use Gemini Pro model for better quality quiz questions
      const response = await this.callGeminiAPI('pro', prompt, {
        temperature: 0.5,
        maxTokens: 800,
        topP: 0.9
      });

      // Parse the response and convert to structured quiz questions
      const rawQuestions = response.text || '';
      const questions = [];

      try {
        // Improved parsing logic using regex
        const questionRegex = /Q\d+:?\s*(.+?)\s*\n\s*A\)\s*(.+?)\s*\n\s*B\)\s*(.+?)\s*\n\s*C\)\s*(.+?)\s*\n\s*D\)\s*(.+?)\s*\n\s*Answer:?\s*([A-D])/gis;
        
        let match;
        while ((match = questionRegex.exec(rawQuestions)) !== null && questions.length < numQuestions) {
          const [_, question, optionA, optionB, optionC, optionD, answer] = match;
          
          // Convert answer letter (A-D) to index (0-3)
          const correctAnswer = answer.toUpperCase().charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.
          
          questions.push({
            question: question.trim(),
            options: [
              optionA.trim(),
              optionB.trim(),
              optionC.trim(),
              optionD.trim()
            ],
            correctAnswer: Math.max(0, Math.min(3, correctAnswer)) // Ensure index is 0-3
          });
        }
        
        // Fallback to simpler parsing if the regex approach didn't work
        if (questions.length === 0) {
          const questionBlocks = rawQuestions.split(/Q\d+:|Question \d+:/i).filter(block => block.trim());
          
          for (const block of questionBlocks) {
            const lines = block.split('\n').filter(line => line.trim());
            if (lines.length >= 5) {
              const question = lines[0].trim();
              const options = [
                lines[1].replace(/^[A-D][\.)]\s*/, '').trim(),
                lines[2].replace(/^[A-D][\.)]\s*/, '').trim(),
                lines[3].replace(/^[A-D][\.)]\s*/, '').trim(),
                lines[4].replace(/^[A-D][\.)]\s*/, '').trim(),
              ];
              
              // Find correct answer
              let correctAnswer = 0; // Default to first option
              const answerLine = lines.find(line => line.toLowerCase().includes('answer'));
              if (answerLine) {
                const letterMatch = answerLine.match(/([A-D])/i);
                if (letterMatch) {
                  correctAnswer = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
                }
              }
              
              questions.push({
                question,
                options,
                correctAnswer: Math.max(0, Math.min(3, correctAnswer))
              });
              
              if (questions.length >= numQuestions) break;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing quiz questions:', error);
      }
      
      // If we couldn't parse any questions, provide default ones
      if (questions.length === 0) {
        questions.push({
          question: "What is the main topic of the text?",
          options: [
            "It varies based on the content",
            "Unable to determine",
            "Please review the content yourself",
            "The quiz generation failed"
          ],
          correctAnswer: 0
        });
      }

      return questions;
    } catch (error) {
      console.error('Quiz generation error:', error);
      // Return a default question if there's an error
      return [{
        question: "Quiz generation failed. What might be the reason?",
        options: [
          "API connection issues",
          "Text might be too complex",
          "Model limitations",
          "All of the above"
        ],
        correctAnswer: 3
      }];
    }
  }
  /**
   * Analyze the emotional tone of text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} - Emotional analysis result with dominant emotions and intensity
   */
  async analyzeEmotions(text) {
    try {
      // Truncate text if too long
      const truncatedText = text.length > 1000 ? text.substring(0, 1000) : text;
      
      // Create a structured prompt for emotion analysis
      const prompt = `Analyze the emotional tone of the following text. Return exactly 3 emotions and their intensities (as decimal values between 0 and 1) in JSON format like this:
{
  "emotions": [
    {"emotion": "joy", "intensity": 0.8},
    {"emotion": "surprise", "intensity": 0.4},
    {"emotion": "neutral", "intensity": 0.2}
  ]
}

Use emotions like: joy, sadness, anger, fear, surprise, disgust, neutral, love, excitement, confusion, etc.
The text to analyze: "${truncatedText}"`;

      // Use the flash model for faster emotion analysis
      const response = await this.callGeminiAPI('flash', prompt, {
        temperature: 0.3
      });

      if (response && response.text) {
        // Try to extract JSON from the response
        try {
          // Extract JSON object from the response text
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const emotionData = JSON.parse(jsonMatch[0]);
            
            if (emotionData && emotionData.emotions && Array.isArray(emotionData.emotions)) {
              const emotions = emotionData.emotions
                .slice(0, 3)
                .map(item => ({
                  emotion: item.emotion,
                  intensity: parseFloat(item.intensity) || 0.5
                }));
                
              return {
                dominant: emotions[0].emotion,
                emotions: emotions
              };
            }
          }
        } catch (parseError) {
          console.error('Error parsing emotion JSON:', parseError);
        }
        
        // Manual parsing fallback
        const emotionLines = response.text.match(/["']?emotion["']?\s*[:=]\s*["']?([^"',}]+)["']?/gi);
        const intensityLines = response.text.match(/["']?intensity["']?\s*[:=]\s*(0\.\d+)/gi);
        
        if (emotionLines && emotionLines.length > 0) {
          const emotions = [];
          
          for (let i = 0; i < Math.min(3, emotionLines.length); i++) {
            const emotionMatch = emotionLines[i].match(/["']?emotion["']?\s*[:=]\s*["']?([^"',}]+)["']?/i);
            const intensityMatch = intensityLines && intensityLines[i] 
              ? intensityLines[i].match(/["']?intensity["']?\s*[:=]\s*(0\.\d+)/i)
              : null;
              
            if (emotionMatch) {
              emotions.push({
                emotion: emotionMatch[1].toLowerCase().trim(),
                intensity: intensityMatch ? parseFloat(intensityMatch[1]) : 0.5
              });
            }
          }
          
          if (emotions.length > 0) {
            return {
              dominant: emotions[0].emotion,
              emotions: emotions
            };
          }
        }
      }
      
      // Default response if parsing fails
      return {
        dominant: 'neutral',
        emotions: [{ emotion: 'neutral', intensity: 1.0 }]
      };
    } catch (error) {
      console.error('Emotion analysis error:', error);
      return {
        dominant: 'unknown',
        emotions: [{ emotion: 'neutral', intensity: 1.0 }]
      };
    }
  }

  /**
   * Get suggestions for journaling prompts based on mood
   * @param {string} mood - User's mood
   * @returns {Promise<Array<string>>} - Array of journal prompt suggestions
   */
  async getJournalPrompts(mood) {
    try {
      const prompt = `You are a helpful assistant that provides thoughtful journaling prompts.
      
Generate 3 specific journaling prompts for someone feeling ${mood}. Each prompt should be 1-2 sentences and encourage self-reflection. 

Format your response as a numbered list like this:
1. [First prompt]
2. [Second prompt]
3. [Third prompt]`;

      const response = await this.callGeminiAPI('flash', prompt, {
        maxTokens: 200,
        temperature: 0.7
      });
      
      if (response && response.text) {
        // Extract prompts (assumes they're numbered or in a list format)
        const promptText = response.text;
        const promptList = promptText
          .split(/\d+\.|\n-|\n\*/)
          .map(item => item.trim())
          .filter(item => item.length > 10);
        
        return promptList.slice(0, 3);
      }
      
      // Default prompts if API call fails
      return [
        "What are three things that went well today and why?",
        "Describe a challenge you faced recently and what you learned from it.",
        "What are you grateful for in this moment?"
      ];
    } catch (error) {
      console.error('Journal prompts error:', error);
      // Default prompts if there's an error
      return [
        "What are three things that went well today and why?",
        "Describe a challenge you faced recently and what you learned from it.",
        "What are you grateful for in this moment?"
      ];
    }
  }
  
  /**
   * Check if the API service is accessible
   * @returns {Promise<Object>} - Status information
   */
  async checkStatus() {
    try {
      // Test with a simple prompt using the flash-lite model
      const testResponse = await this.callGeminiAPI(
        'flash', 
        "Explain how AI works in a few words"
      );
      
      if (testResponse && testResponse.text) {
        return {
          status: 'ok',
          message: `Google Gemini API service is accessible (using ${this.flashModel})`,
          timestamp: new Date().toISOString(),
          sample: testResponse.text.substring(0, 100) + '...' // Include a small sample of the response
        };
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('API status check failed:', error);
      return {
        status: 'error',
        message: `Google Gemini API service is not accessible: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new ApiClient();