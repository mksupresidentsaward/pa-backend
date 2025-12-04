require('dotenv').config();
const emailService = require('./services/emailService');

async function testFullFlow() {
    try {
        console.log('Testing full application flow emails...');

        const mockApplication = {
            fullName: 'Test Applicant',
            email: process.env.ADMIN_EMAIL, // Send to admin email for testing
            phone: '1234567890',
            course: 'Bsc. Computer Science',
            message: 'I want to join because I love adventure.',
        };

        console.log('1. Sending Application Confirmation...');
        await emailService.sendApplicationConfirmation(mockApplication.email, mockApplication.fullName);

        console.log('2. Sending Admin Notification...');
        await emailService.sendAdminApplicationNotification(mockApplication);

        console.log('Test finished successfully.');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testFullFlow();
