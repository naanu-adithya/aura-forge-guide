import axios from 'axios';

// Create an API client instance with a base URL
// Using relative URL to work with Vite's proxy
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API endpoints
export const apiService = {
  // System status
  checkStatus: () => api.get('/status'),
  
  // Chat endpoints
  sendChatMessage: (mood: string, message: string) => 
    api.post(`/chat/${mood}`, { message }),
  
  // Journal endpoints
  analyzeJournal: (content: string) => 
    api.post('/journal/analyze', { content }),
  saveJournalEntry: (content: string, mood?: string) =>
    api.post('/journal', { content, mood }),
  getJournalEntries: (userId?: string) => 
    api.get(`/journal/${userId || 'local'}`),
  getJournalPrompts: (mood: string) => 
    api.get(`/journal/prompts/${mood}`),
  
  // Study endpoints
  generateQuiz: (text: string, numQuestions = 3) => 
    api.post('/study/quiz', { text, numQuestions }),
  summarizeText: (text: string) => 
    api.post('/summary', { text }),
};

export default api;