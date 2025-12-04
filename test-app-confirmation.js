require('dotenv').config();
const emailService = require('./services/emailService');

async function testConfirmation() {
    try {
        console.log('Testing sendApplicationConfirmation...');
        const email = process.env.ADMIN_EMAIL; // Send to admin for testing
        const name = 'Test User';

        await emailService.sendApplicationConfirmation(email, name);
        console.log('Test finished.');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testConfirmation();
