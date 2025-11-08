import express from 'express';
import { GeminiService } from '../services/geminiService.js';
import { validateCompletionRequest, handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Initialize service lazily
let geminiService = null;

const getGeminiService = () => {
  if (!geminiService) {
    try {
      geminiService = new GeminiService({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'gemini-2.5-flash',
        temperature: 0.1, // Lower temperature for code completions
        maxTokens: 256 // Shorter completions for inline suggestions
      });
    } catch (error) {
      console.error('Failed to initialize Gemini service for completions:', error.message);
      throw error;
    }
  }
  return geminiService;
};

router.post('/', validateCompletionRequest, handleValidationErrors, async (req, res) => {
  try {
    const { code, cursorPosition, language, context } = req.body;

    // Build completion prompt
    const prompt = `You are an AI code completion assistant. Complete the following ${language} code at the cursor position.

Current code:
${code}

Cursor is at line ${cursorPosition.line}, column ${cursorPosition.column}.

${context ? `Additional context: ${context}` : ''}

Provide only the completion text that should be inserted at the cursor. Keep it concise and relevant. Do not include any explanations or comments.`;

    const service = getGeminiService();
    const completion = await service.generateCompletion(prompt, { maxTokens: 128 });

    // Clean up the completion (remove any unwanted formatting)
    const cleanCompletion = completion.trim();

    res.json({
      completion: cleanCompletion,
      success: true
    });

  } catch (error) {
    console.error('Completion error:', error);
    res.status(500).json({
      error: 'Failed to generate completion',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

export default router;