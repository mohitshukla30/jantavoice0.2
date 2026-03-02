const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Auto-categorize a complaint using Groq AI
 */
const autoCategory = async (title, description) => {
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a civic complaint classifier for Indian cities. 
Given a complaint title and description, respond with ONLY a JSON object like:
{"category": "Roads", "priority": "High", "tags": ["pothole", "road damage"], "summary": "One sentence summary"}

Categories: Roads, Water, Electricity, Sanitation, Parks, Safety, Noise, Other
Priority: Low, Medium, High, Critical

Rules:
- Safety issues (chemical waste, violence, fire hazards) = Critical
- No water/electricity for multiple days = High  
- Potholes, garbage = Medium
- Noise, cosmetic park issues = Low
Respond ONLY with valid JSON, no extra text.`,
        },
        {
          role: 'user',
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 200,
    });

    const raw = chat.choices[0]?.message?.content?.trim();
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.warn('⚠️ Groq AI categorization failed, using defaults:', err.message);
    return null;
  }
};

/**
 * Generate admin response suggestion using Groq AI
 */
const generateAdminNote = async (complaintTitle, complaintCategory, status) => {
  try {
    const chat = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a helpful civic authority assistant in India. Generate a professional, 
empathetic admin response note for a public complaint. Keep it under 100 words. 
Be specific about next steps. Respond in English only.`,
        },
        {
          role: 'user',
          content: `Complaint: "${complaintTitle}" (Category: ${complaintCategory})
New Status: ${status}
Write an admin note explaining what action is being taken.`,
        },
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 150,
    });

    return chat.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('⚠️ Groq admin note generation failed:', err.message);
    return null;
  }
};

module.exports = { groq, autoCategory, generateAdminNote };
