import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function testOpenRouter() {
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
                messages: [{ role: 'user', content: 'Say hello in 1 word' }]
            })
        });

        const data = await res.json();
        fs.writeFileSync('test-output.json', JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        fs.writeFileSync('test-output.json', JSON.stringify({ error: err.message }, null, 2), 'utf8');
    }
}

testOpenRouter();
