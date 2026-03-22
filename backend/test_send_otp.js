const { sendOTP } = require('./utils/brevo');

async function test() {
    console.log("Testing sendOTP function...");
    // Replace with a valid email for testing if needed, or use a dummy one to see the error
    await sendOTP("sisira_23l001cs@gecwyd.ac.in", "123456");
    console.log("Test finished.");
}

test();
