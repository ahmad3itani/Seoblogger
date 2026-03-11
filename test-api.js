require('dotenv').config({ path: '.env' });

async function testOpenRouter() {
    console.log("Using API Key:", process.env.OPENROUTER_API_KEY?.substring(0, 10) + "...");
    console.log("Using Model:", process.env.AI_MODEL);

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
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}

testOpenRouter();
