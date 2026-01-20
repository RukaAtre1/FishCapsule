
import fs from 'fs';
import path from 'path';

async function main() {
    // 1. Manually load .env.local (strict for script environment)
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
            }
        });
    }

    // 2. Import central wrapper
    // We use dynamic import to ensure env vars are set before module init
    const { generateGeminiResponse } = await import('../lib/llm/gemini');

    console.log("--- Gemini 2.5 Flash Lite Connectivity Test ---");
    console.log("Model: gemini-2.5-flash-lite");

    const result = await generateGeminiResponse({
        task: "step1_explain",
        contents: [
            { role: "user", parts: [{ text: "Hello! If you can see this, reply with 'Gemini 2.5 Online' and a 1-sentence interesting fact about space." }] }
        ],
        temperature: 0.7,
        maxOutputTokens: 100
    });

    if (result.ok) {
        console.log("\nSuccess!");
        console.log("Response text:");
        console.log(result.value); // This prints response.text
        console.log("\nMeta:", result.meta);
    } else {
        console.error("\nFailed!");
        console.error("Error:", result.error);
    }
}

main().catch(console.error);
