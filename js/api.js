// Gemini Developer Studio - API Client
// Handles all communication with the Gemini backend

const config = window.GEMINI_CONFIG;

window.GeminiAPI = {
  async sendMessage(messages, projectId = null) {
    // messages: [{role: 'user'|'assistant', content: string}]
    try {
      const res = await fetch(`${config.API_ENDPOINT}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          project_id: projectId,
        }),
      });
      if (!res.ok) throw new Error('Failed to contact Gemini backend');
      return await res.json();
    } catch (err) {
      console.error('[GeminiAPI] Error sending message:', err);
      return { error: err.message };
    }
  },
  async streamMessage(messages, projectId = null, onChunk) {
    // Stream chat response from Gemini backend
    try {
      const res = await fetch(`${config.API_ENDPOINT}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, project_id: projectId }),
      });
      if (!res.ok || !res.body) throw new Error('Failed to stream from Gemini backend');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (onChunk) onChunk(chunk);
      }
    } catch (err) {
      console.error('[GeminiAPI] Error streaming message:', err);
      if (onChunk) onChunk(`[error] ${err.message}`);
    }
  }
};
