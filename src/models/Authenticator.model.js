import mongoose from 'mongoose';

const AuthenticatorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    credentialID: {
        type: Buffer,
        required: true,
        unique: true,
    },
    credentialPublicKey: {
        type: Buffer,
        required: true,
    },
    counter: {
        type: Number,
        required: true,
        default: 0,
    },
}, { timestamps: true });

export default mongoose.model('Authenticator', AuthenticatorSchema);
