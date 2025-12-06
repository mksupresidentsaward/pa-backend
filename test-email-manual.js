require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
    console.log('Starting email test...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP User:', process.env.SMTP_USER ? '***' : 'Missing');

    const testEmail = process.env.ADMIN_EMAIL || 'test@example.com';
    console.log(`Attempting to send test email to: ${testEmail}`);

    try {
        await emailService.sendApplicationConfirmation(testEmail, 'Test User');
        console.log('✅ Email sent successfully!');
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

testEmail();
