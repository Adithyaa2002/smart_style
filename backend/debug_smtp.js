const { sendOTP } = require('./utils/brevo');
const fs = require('fs');

async function test() {
    console.log("Testing SMTP sendOTP function...");
    try {
        await sendOTP("sisira_23l001cs@gecwyd.ac.in", "123456");
        fs.writeFileSync('smtp_debug.log', 'SUCCESS: OTP sent');
        console.log("Test finished with success.");
    } catch (e) {
        fs.writeFileSync('smtp_debug.log', `FAILURE: ${e.message}\n${e.stack}`);
        console.error("Test finished with error:", e.message);
    }
}

test();
