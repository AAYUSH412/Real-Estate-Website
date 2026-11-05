import './environment.js';
import ImageKit from 'imagekit';
import { ContractError } from '@buildestate/contracts';

const missing = ['IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT'].filter(name => !process.env[name]);

// Production must not start half-configured. Local development can run without an
// ImageKit account, so only photo uploads fail, with a message that says why.
if (missing.length && process.env.NODE_ENV === 'production') {
  throw new Error(`Missing ${missing[0]}`);
}

const unavailable = async () => {
  throw new ContractError('Photo uploads need ImageKit keys. Add the IMAGEKIT_* values to backend/.env.local and restart the API.', 'images', 400, 'IMAGEKIT_NOT_CONFIGURED');
};

const imagekit = missing.length
  ? { upload: unavailable, deleteFile: unavailable }
  : new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

export default imagekit;
