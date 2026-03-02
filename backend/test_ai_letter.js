const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const { groq } = require('./config/groq');
const Complaint = require('./models/Complaint');

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const complaint = await Complaint.findOne();
    if (!complaint) return console.log('no comp');

    const systemPrompt = `You are an expert Indian government document writer. Generate a formal complaint letter in proper Indian government format. The letter must include:
1. Proper salutation to the concerned government department
2. Subject line (RE: Formal Complaint Regarding [category])
3. Reference number placeholder: JV/[YEAR]/[RANDOM_5_DIGITS]
4. Date in DD/MM/YYYY format
5. Body paragraphs: introduction, detailed description of issue, impact on citizens, previous actions taken (if any), specific demands/requests
6. Formal closing with complainant details
7. CC line to relevant departments
Use formal English style. Keep it under 400 words.
Return ONLY a valid JSON object matching exactly this structure: {"letterText": "string", "subject": "string", "referenceNumber": "string", "department": "string", "ccList": "string"}`;

    const userPrompt = `Complaint Details:\nTitle: ${complaint.title}\nDescription: ${complaint.description}`;

    try {
        const chat = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: process.env.GROQ_MODEL || 'llama3-8b-8192',
            temperature: 0.2,
            max_tokens: 1000,
        });
        console.log('AI Response:', chat.choices[0].message.content);

        let rawText = chat.choices[0].message.content.trim();
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) throw new Error('No JSON output from Groq');

        // Check pdf generation
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const os = require('os');
        const path = require('path');

        const docPath = path.join(os.tmpdir(), 'test_letter.pdf');
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(docPath);
        doc.pipe(writeStream);
        doc.text('Testing generation');
        doc.end();

        writeStream.on('finish', () => console.log('PDF success'));

    } catch (e) { console.error('Err:', e.message); }

    setTimeout(() => process.exit(), 1000);
}
run();
