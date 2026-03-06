const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

async function callGroq(prompt, maxTokens = 400, temperature = 0.2) {
    const res = await groq.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature
    });
    return res.choices[0].message.content.trim();
}

function parseJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in AI response');
    return JSON.parse(match[0]);
}

// ── 1. ANALYZE COMPLAINT ──
async function analyzeComplaint(rawText, locationHint = '') {
    const prompt = `You are an AI for JantaVoice, India's civic complaint platform.
Analyze this citizen complaint. Return ONLY valid JSON, no extra text:

Complaint: "${rawText}"
Location hint: "${locationHint}"

{
  "title": "clean concise title under 100 chars",
  "description": "professional expanded 2-3 sentence description",
  "issueType": "specific issue",
  "category": "Roads|Water|Electricity|Sanitation|Parks|Safety|Noise|Air Quality|Other",
  "department": "responsible government department",
  "priority": "Low|Medium|High|Critical",
  "city": "extracted city or empty",
  "state": "extracted state or empty",
  "location": "full location string",
  "tags": ["tag1","tag2"],
  "urgencyReason": "why this priority",
  "confidence": 0.9
}`;
    const text = await callGroq(prompt, 500, 0.2);
    return parseJSON(text);
}

// ── 2. FAKE COMPLAINT DETECTION ──
async function detectFake(complaint, userStats) {
    const prompt = `Analyze if this Indian civic complaint is genuine or fake/spam.
Title: "${complaint.title}"
Description: "${complaint.description}"
Category: "${complaint.category}"
User complaints today: ${userStats.todayCount}
Similar complaints nearby (24h): ${userStats.similarCount}
User warnings: ${userStats.warnings}

Return ONLY JSON:
{
  "isFake": false,
  "fakeScore": 0.05,
  "isDuplicate": false,
  "isSpam": false,
  "isAbusive": false,
  "reasons": [],
  "recommendation": "approve|flag|reject",
  "confidence": 0.92
}`;
    const text = await callGroq(prompt, 300, 0.1);
    return parseJSON(text);
}

// ── 3. FORMAL LETTER ──
async function generateLetter(complaint, userName) {
    const { DEPARTMENT_MAP } = require('../config/constants');
    const dept = DEPARTMENT_MAP[complaint.category]?.name || 'General Grievance Cell';
    const refNum = complaint.referenceNumber || ('JV/' + new Date().getFullYear() + '/' + Math.floor(Math.random() * 90000 + 10000));
    const prompt = `Write a formal Indian government complaint letter.
Issue: ${complaint.title}
Description: ${complaint.description}
Category: ${complaint.category}
Department: ${dept}
Location: ${complaint.location?.address || ''}, ${complaint.location?.city || ''}
Complainant: ${userName}
Ref: ${refNum}
Date: ${new Date().toLocaleDateString('en-IN')}

Write a proper Indian government letter with:
- To: Department head
- Subject line
- 4 body paragraphs (intro, issue details, impact, requested action + deadline)
- Formal closing with CC to 2 authorities
Under 350 words. Return only the letter text.`;
    return callGroq(prompt, 600, 0.3);
}

// ── 4. AI STATUS MESSAGE ──
async function statusMessage(complaint, newStatus) {
    const prompt = `Write a 2-sentence empathetic update for an Indian citizen.
Complaint: "${complaint.title}" (${complaint.category})
New Status: "${newStatus}"
Be specific and reassuring. Simple English. Return only the message.`;
    return callGroq(prompt, 120, 0.6);
}

// ── 5. CALL SCRIPT ──
async function callScript(complaint) {
    const prompt = `Generate an AI voice call script to be spoken to a government officer.
Complaint: ${complaint.title}
Category: ${complaint.category}
Department: ${complaint.department || 'concerned department'}
Priority: ${complaint.priority}
Location: ${complaint.location?.address || ''}, ${complaint.location?.city || ''}
Reference: ${complaint.complaintId || complaint._id}

Write natural spoken script (not a letter):
1. Introduce as JantaVoice automated system
2. State complaint clearly in 2 sentences
3. Mention priority and reference ID
4. Request acknowledgment and action timeline
5. Provide callback info
Under 180 words. Natural spoken language.`;
    return callGroq(prompt, 300, 0.4);
}

// ── 6. CHATBOT REPLY ──
async function chatbotReply(message, history = [], userName = 'Citizen') {
    const system = `You are JantaBot, AI assistant for JantaVoice India's civic complaint platform.
Help citizens: file complaints, track status, understand government processes, generate letters.
Rules:
- Respond in same language as user (Hindi/English/Hinglish)
- Keep responses under 3 sentences unless explaining a process
- If user describes a civic issue → say "I can help file this complaint right now"
- Never make up government phone numbers
- End with a helpful next step
User: ${userName}`;

    const res = await groq.chat.completions.create({
        model: MODEL,
        messages: [
            { role: 'system', content: system },
            ...history.slice(-8),
            { role: 'user', content: message }
        ],
        max_tokens: 220,
        temperature: 0.7
    });
    return res.choices[0].message.content.trim();
}

module.exports = { analyzeComplaint, detectFake, generateLetter, statusMessage, callScript, chatbotReply };
