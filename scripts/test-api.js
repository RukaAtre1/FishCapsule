const fetch = require('node-fetch'); // Assuming node environment has fetch or I'll use http
// Actually, in modern Node (v18+), fetch is global. If not, I'll use http.
// Let's assume fetch for simplicity or use http if needed. Use dynamic import or just standard http.

const http = require('http');

function postRequest(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: responseBody
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("--- TEST 1: Success Case ---");
    try {
        const successRes = await postRequest('/api/outline', {
            syllabusText: "Introduction to Biology. Week 1: Cells. Week 2: Genetics.",
            courseTitle: "Bio 101"
        });
        console.log("Status:", successRes.status);
        console.log("Body:", successRes.body);
    } catch (e) {
        console.error("Success case failed:", e.message);
    }

    console.log("\n--- TEST 2: Fallback/Error Case (Empty Syllabus) ---");
    try {
        const errorRes = await postRequest('/api/outline', {
            syllabusText: "",
            courseTitle: "Empty Course"
        });
        console.log("Status:", errorRes.status);
        console.log("Body:", errorRes.body);
    } catch (e) {
        console.error("Error case failed:", e.message);
    }
}

run();
