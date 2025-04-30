import nodemailer from 'nodemailer';
import config from 'config';

const mailAuth = config.get('mailAuth');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: mailAuth?.user,
        pass: mailAuth?.pass,
    },
});

// Reusable function to call in other controllers
export const sendMail = async (to, subject, text) => {
    const mailOptions = {
        from: mailAuth.user,
        to,
        subject,
        text,
    };

    return await transporter.sendMail(mailOptions);
};
