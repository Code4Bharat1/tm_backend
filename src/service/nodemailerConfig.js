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

// If HTML content is passed, use `html`; otherwise use `text`
export const sendMail = async (to, subject, text) => {
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(text);

  const mailOptions = {
    from: mailAuth.user,
    to,
    subject,
    ...(isHtml ? { html: text } : { text: text }),
  };

  return await transporter.sendMail(mailOptions);
};
