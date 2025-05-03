import crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY; // 32 bytes
const iv = crypto.randomBytes(16);

export function encrypt(text) {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText) {
    const [ivHex, content] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
