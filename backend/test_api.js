require("dotenv").config();
const Brevo = require("@getbrevo/brevo");

async function testApi() {
    console.log("--- BREVO API TEST ---");

    let defaultClient = Brevo.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    let apiInstance = new Brevo.TransactionalEmailsApi();
    let sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.subject = "SmartStyle API Test";
    sendSmtpEmail.htmlContent = "<html><body><h1>This is a test from the Brevo API</h1></body></html>";
    // We try using the user's SMTP login as the sender email, 
    // though usually real emails are preferred.
    sendSmtpEmail.sender = { "name": "SmartStyle", "email": "9f2f2b001@smtp-brevo.com" }; // Trying previous login as sender or dummy
    sendSmtpEmail.to = [{ "email": "sisira_23l001cs@gecwyd.ac.in" }];

    try {
        console.log("Sending email via API...");
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log("✅ API SUCCESS! Message ID:", data.messageId);
    } catch (error) {
        console.error("❌ API FAILURE:");
        if (error.response && error.response.body) {
            console.error(JSON.stringify(error.response.body, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testApi();
