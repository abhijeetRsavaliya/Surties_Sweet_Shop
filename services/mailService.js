const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'help.infosurties@gmail.com',
        pass: 'baxz nwjq mydh iabm'
    },
    tls: {
        rejectUnauthorized: false
    },
    logger: true, // Enable built-in logger
    debug: true   // Include SMTP traffic in the logs
});

const sendHelpRequestEmail = async (helpData) => {
    console.log('Attempting to send email with data:', helpData);
    
    try {
        if (!helpData.email || !helpData.name || !helpData.message) {
            console.error('Missing required fields:', helpData);
            throw new Error('Missing required fields');
        }

        // Create bank details HTML section with validation
        let bankDetailsHTML = '';
        if (helpData.type === 'refund' && helpData.bankDetails) {
            const { bankName, accountNumber, ifscCode } = helpData.bankDetails;
            if (bankName && accountNumber && ifscCode) {
                bankDetailsHTML = `
                    <div style="background: #fff3f4; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <h3 style="color: #ff4757; margin: 0 0 10px 0;">Bank Details for Refund</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0;"><strong>Bank Name:</strong></td>
                                <td style="padding: 8px 0;">${bankName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>Account Number:</strong></td>
                                <td style="padding: 8px 0;">${accountNumber}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;"><strong>IFSC Code:</strong></td>
                                <td style="padding: 8px 0;">${ifscCode}</td>
                            </tr>
                        </table>
                    </div>
                `;
            }
        }

        const mailOptions = {
            from: {
                name: 'Surties Sweet Shop Help Desk',
                address: 'help.infosurties@gmail.com'
            },
            to: ['help.infosurties@gmail.com'],
            replyTo: helpData.email,
            subject: `New ${helpData.type === 'refund' ? 'Refund Request' : 'Help Request'} from ${helpData.name}`,
            text: `New ${helpData.type} request from ${helpData.name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #ff4757; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
                        <h2 style="margin: 0;">New ${helpData.type === 'refund' ? 'Refund Request' : 'Help Request'}</h2>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px;">
                        <div style="background: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                            <h3 style="color: #ff4757; margin: 0 0 10px 0;">Customer Details</h3>
                            <p><strong>Name:</strong> ${helpData.name}</p>
                            <p><strong>Email:</strong> ${helpData.email}</p>
                            <p><strong>Order ID:</strong> ${helpData.orderId || 'N/A'}</p>
                            <p><strong>Request Type:</strong> ${helpData.type}</p>
                        </div>
                        
                        ${bankDetailsHTML}

                        <div style="background: white; padding: 15px; border-radius: 5px;">
                            <h3 style="color: #ff4757; margin: 0 0 10px 0;">Message</h3>
                            <p style="line-height: 1.6;">${helpData.message}</p>
                        </div>
                        
                        <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
                            Sent on: ${new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            `
        };

        console.log('Sending email with options:', {
            ...mailOptions,
            // Log sanitized version of bank details if present
            bankDetails: helpData.bankDetails ? 'Present' : 'Not present'
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return { 
            success: true, 
            messageId: info.messageId,
            response: info.response
        };
    } catch (error) {
        console.error('Error in sendHelpRequestEmail:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to send email'
        };
    }
};

// Test the email configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to take messages');
    }
});

module.exports = {
    sendHelpRequestEmail
};
