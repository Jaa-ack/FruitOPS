// Deprecated in frontend: AI calls now go through backend /api/ai for security.
export const getGeminiAdvice = async () => {
  throw new Error('Use server /api/ai proxy instead of calling Gemini directly from the frontend.');
};