import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import base64url from 'base64url';
import Authenticator from '../models/Authenticator.model.js';
import User from '../models/user.model.js';
import { rpID, rpName, originFrontend, origin } from '../../config/webauthn.config.js';

function stringToUint8Array(str) {
    return new TextEncoder().encode(str);
  }

const challengeMap = new Map();

export const generateRegistrationOptionsController = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.adminId;
        const email = req.user.email || req.user.adminEmail;


        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: stringToUint8Array(userId.toString()),
            timeout: 60000,
            userName: email,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        challengeMap.set(userId, options.challenge);

        res.json(options);
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate registration options' });
    }
};

export const verifyRegistrationController = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.adminId;
        const { attestationResponse } = req.body;

        if (!attestationResponse) {
            return res.status(400).json({ error: 'Missing attestation response' });
        }

        const expectedChallenge = challengeMap.get(userId);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'No challenge found for this user' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const verification = await verifyRegistrationResponse({
            response: attestationResponse,
            expectedChallenge,
            expectedOrigin: originFrontend,
            expectedRPID: rpID,
        });

        const { verified, registrationInfo } = verification;
        console.log('✅ Registration verification:', verification);

        if (!verified || !registrationInfo) {
            return res.status(400).json({ error: 'Registration verification failed' });
        }

        const credentials = registrationInfo;
        const credentialID = credentials.credential.id;
        const credentialPublicKey = credentials.credential.publicKey;
        const counter = credentials.credential.counter;

        if (!credentialID || !credentialPublicKey) {
            return res.status(400).json({ error: 'Missing credential data' });
        }

        // Check if already registered
        const existing = await Authenticator.findOne({ credentialID: Buffer.from(credentialID) });

        if (!existing) {
            await Authenticator.create({
                userId,
                credentialID: Buffer.from(credentialID),
                credentialPublicKey: Buffer.from(credentialPublicKey),
                counter,
            });
        }

        challengeMap.delete(userId);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Registration verification error:', err);
        res.status(500).json({ error: err.message || 'Registration verification failed' });
    }
  };

export const generateAuthenticationOptionsController = async (req, res) => {
    const { credential } = req.body;
    console.log(req.body);

    const user = await User.findOne({
        $or: [{ email: credential }, { phone: credential }],
    });


    if (!user) return res.status(404).json({ error: 'User not found' });

    const authenticators = await Authenticator.find({ userId: user._id });

    const options = await generateAuthenticationOptions({
        rpID,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: authenticators.map(auth => ({
            id: base64url.encode(
                Buffer.isBuffer(auth.credentialID)
                    ? auth.credentialID
                    : Buffer.from(auth.credentialID)
            ),
            type: 'public-key',
            transports: ['internal'],
          })),
    });
    console.log("✅ Generated authentication options:", options);

    challengeMap.set(user._id.toString(), options.challenge);


    return res.json({
        options,
        userId: user._id,
        email: user.email,
    });
};

export const verifyAuthenticationController = async (req, res) => {
    try {
        const userId = req.body.userId;
        const { assertionResponse } = req.body;

        const expectedChallenge = challengeMap.get(userId);
        if (!expectedChallenge) {
            return res.status(400).json({ error: 'No challenge found' });
        }

        const authenticators = await Authenticator.find({ userId });
        const dbAuthenticator = authenticators.find(auth =>
            auth.credentialID.equals(Buffer.from(assertionResponse.rawId, 'base64url'))
        );

        if (!dbAuthenticator) {
            return res.status(404).json({ error: 'Authenticator not found' });
        }

        const verification = await verifyAuthenticationResponse({
            response: assertionResponse,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: dbAuthenticator.credentialID,
                credentialPublicKey: dbAuthenticator.credentialPublicKey,
                counter: dbAuthenticator.counter,
            },
        });

        const { verified, authenticationInfo } = verification;

        console.log('✅ Authentication verification:', verification);

        if (!verified) {
            return res.status(400).json({ error: 'Authentication failed' });
        }

        dbAuthenticator.counter = authenticationInfo.newCounter;
        await dbAuthenticator.save();

        challengeMap.delete(userId);
        console.log('Authentication successful for user:', userId);
        const user = await User.findById(userId);
        return res.json({ success: true, email: user?.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Authentication verification failed' });
    }
};

