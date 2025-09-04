const nodemailer = require('nodemailer');
const logger = require('./logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      logger.warn('Email service not configured. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email service configuration error:', error);
      } else {
        logger.info('Email service ready');
      }
    });
  }

  async sendEmail({ to, subject, text, html }) {
    if (!this.transporter) {
      logger.warn('Email service not available, cannot send email');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${subject}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.SERVER_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - Hostel Mess Management</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Hostel Mess Management account.</p>
            <p>If you made this request, click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Hostel Mess Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request
      
      We received a request to reset your password for your Hostel Mess Management account.
      
      If you made this request, visit the following link to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, you can safely ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset - Hostel Mess Management',
      text,
      html
    });
  }

  async sendWelcomeEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome - Hostel Mess Management</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Hostel Mess Management!</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Welcome to our Hostel Mess Management System! Your account has been successfully created.</p>
            <p>You can now:</p>
            <ul>
              <li>Manage your meal subscriptions</li>
              <li>Scan QR codes for attendance</li>
              <li>View weekly menus</li>
              <li>Receive important notifications</li>
            </ul>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Hostel Mess Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to Hostel Mess Management!
      
      Hello ${name},
      
      Welcome to our Hostel Mess Management System! Your account has been successfully created.
      
      You can now:
      - Manage your meal subscriptions
      - Scan QR codes for attendance
      - View weekly menus
      - Receive important notifications
      
      If you have any questions or need assistance, please don't hesitate to contact our support team.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Hostel Mess Management',
      text,
      html
    });
  }

  async sendSubscriptionNotification(email, name, subscriptionDetails) {
    const { plan_type, start_date, end_date, amount } = subscriptionDetails;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Subscription Update - Hostel Mess Management</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Update</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Your subscription has been updated successfully!</p>
            <div class="details">
              <h3>Subscription Details:</h3>
              <p><strong>Plan:</strong> ${plan_type.charAt(0).toUpperCase() + plan_type.slice(1)}</p>
              <p><strong>Start Date:</strong> ${start_date}</p>
              <p><strong>End Date:</strong> ${end_date}</p>
              <p><strong>Amount:</strong> ₹${amount}</p>
            </div>
            <p>You can now use your QR code to mark attendance for meals.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Hostel Mess Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Subscription Updated - Hostel Mess Management',
      html
    });
  }
}

module.exports = new EmailService();