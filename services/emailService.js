const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a colorful HTML email template
 * @param {string} title - The main heading of the email
 * @param {string} content - The HTML content of the body
 * @returns {string} - Full HTML string
 */
const getEmailTemplate = (title, content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background-color: #002D62; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
        .colored-band { height: 6px; display: flex; }
        .band-color { flex: 1; height: 100%; }
        .content { padding: 40px 30px; }
        .content h2 { color: #002D62; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; margin-bottom: 20px; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background-color: #00aeef; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; transition: background-color 0.3s; }
        .button:hover { background-color: #009bd5; }
        .info-box { background-color: #f0f9ff; border-left: 4px solid #00aeef; padding: 15px; margin: 20px 0; border-radius: 4px; }
        strong { color: #002D62; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>The President's Award Club</h1>
          <p>Machakos University</p>
        </div>
        <div class="colored-band">
          <div class="band-color" style="background-color: #d82129;"></div>
          <div class="band-color" style="background-color: #ffc222;"></div>
          <div class="band-color" style="background-color: #82c341;"></div>
          <div class="band-color" style="background-color: #00aeee;"></div>
          <div class="band-color" style="background-color: #8b5cf6;"></div>
        </div>
        <div class="content">
          <h2>${title}</h2>
          ${content}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} President's Award Club - Machakos University</p>
          <p>Transform Through Adventure | Serve with Purpose</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send an email
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to} with subject "${subject}"`);
  } catch (error) {
    console.error('Error sending email:', error);
    // We don't throw here to prevent crashing the request if email fails, 
    // but in a production app you might want to handle this differently (e.g. queueing)
  }
};

// --- Application Emails ---

exports.sendApplicationConfirmation = async (email, name) => {
  const subject = "Application Received - President's Award Club";
  const text = `Hi ${name},\n\nThank you for applying to join the President's Award Club at Machakos University. We have received your application and will review it shortly.\n\nBest regards,\nThe PA Club Team`;

  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for your interest in joining the <strong>President's Award Club at Machakos University</strong>.</p>
    <div class="info-box">
      <p style="margin:0;">We have successfully received your application and our team will review it shortly.</p>
    </div>
    <p>You will receive another email once your application status has been updated.</p>
    <p>Best regards,<br>The PA Club Team</p>
  `;

  const html = getEmailTemplate("We've Received Your Application!", content);
  await sendEmail(email, subject, text, html);
};

exports.sendAdminApplicationNotification = async (application) => {
  const subject = "New Membership Application";
  const text = `A new application has been submitted by ${application.fullName} (${application.email}).\n\nPlease log in to the admin dashboard to review it.`;

  const content = `
    <p>A new membership application has been submitted.</p>
    <div class="info-box">
      <p><strong>Name:</strong> ${application.fullName}</p>
      <p><strong>Email:</strong> ${application.email}</p>
      <p><strong>Course:</strong> ${application.course}</p>
      <p><strong>Phone:</strong> ${application.phone}</p>
    </div>
    <p><strong>Motivation:</strong><br>${application.message}</p>
    <a href="${process.env.FRONTEND_ORIGIN || '#'}/admin_dashboard.html" class="button">Go to Admin Dashboard</a>
  `;

  const html = getEmailTemplate("New Application Received", content);
  await sendEmail(process.env.ADMIN_EMAIL, subject, text, html);
};

exports.sendApplicationStatusUpdate = async (email, name, status) => {
  const subject = `Application Update: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  let text, content;

  if (status === 'approved') {
    text = `Hi ${name},\n\nCongratulations! Your application to join the President's Award Club has been approved. We will contact you soon with details about the orientation.\n\nWelcome to the club!`;
    content = `
      <p>Hi <strong>${name}</strong>,</p>
      <div class="info-box" style="border-left-color: #82c341; background-color: #f0fdf4;">
        <p style="margin:0; color: #166534;"><strong>Congratulations!</strong> Your application to join the President's Award Club has been <strong>APPROVED</strong>.</p>
      </div>
      <p>We are thrilled to welcome you to our community of adventurers and leaders.</p>
      <p>We will contact you soon with details about the upcoming orientation and next steps.</p>
      <p>Welcome to the club!</p>
    `;
  } else {
    text = `Hi ${name},\n\nThank you for your interest in the President's Award Club. After careful review, we regret to inform you that we cannot offer you a place at this time.\n\nWe wish you the best in your endeavors.`;
    content = `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Thank you for your interest in the President's Award Club.</p>
      <div class="info-box" style="border-left-color: #d82129; background-color: #fef2f2;">
        <p style="margin:0; color: #991b1b;">After careful review, we regret to inform you that we cannot offer you a place at this time.</p>
      </div>
      <p>We appreciate the time you took to apply and wish you the best in your future endeavors.</p>
    `;
  }

  const html = getEmailTemplate(`Application Status: ${status.toUpperCase()}`, content);
  await sendEmail(email, subject, text, html);
};

// --- Contact Form Emails ---

exports.sendContactConfirmation = async (email, name) => {
  const subject = "Message Received - President's Award Club";
  const text = `Hi ${name},\n\nThank you for contacting us. We have received your message and a member of our team will get back to you as soon as possible.\n\nBest regards,\nThe PA Club Team`;

  const content = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for reaching out to us.</p>
    <div class="info-box">
      <p style="margin:0;">We have received your message and a member of our team will get back to you as soon as possible.</p>
    </div>
    <p>Best regards,<br>The PA Club Team</p>
  `;

  const html = getEmailTemplate("We've Received Your Message", content);
  await sendEmail(email, subject, text, html);
};

exports.sendAdminContactNotification = async (contact) => {
  const subject = `New Contact Message: ${contact.subject}`;
  const text = `A new message has been submitted by ${contact.name} (${contact.email}).\n\nSubject: ${contact.subject}\nMessage: ${contact.message}\n\nPlease log in to the admin dashboard to respond.`;

  const content = `
    <p>A new contact form message has been submitted.</p>
    <div class="info-box">
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      <p><strong>Subject:</strong> ${contact.subject}</p>
    </div>
    <p><strong>Message:</strong><br>${contact.message}</p>
    <a href="${process.env.FRONTEND_ORIGIN || '#'}/admin_dashboard.html" class="button">Go to Admin Dashboard</a>
  `;

  const html = getEmailTemplate("New Contact Message", content);
  await sendEmail(process.env.ADMIN_EMAIL, subject, text, html);
};

exports.sendContactResponse = async (contact, responderName, responseMessage) => {
  const subject = `Re: ${contact.subject || 'Your Message to President\'s Award Club'}`;
  const text = `Hi ${contact.name},\n\n${responseMessage}\n\nBest regards,\n${responderName || 'The President\'s Award Club Team'}`;

  const content = `
    <p>Hi <strong>${contact.name}</strong>,</p>
    <p>In response to your message:</p>
    <div class="info-box" style="background-color: #fff; border: 1px solid #e5e7eb; border-left: 4px solid #00aeef;">
      <p style="margin:0; white-space: pre-wrap;">${responseMessage}</p>
    </div>
    <p>Best regards,<br><strong>${responderName || 'The President\'s Award Club Team'}</strong></p>
  `;

  const html = getEmailTemplate("Response to Your Inquiry", content);
  await sendEmail(contact.email, subject, text, html);
};