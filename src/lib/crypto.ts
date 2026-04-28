import * as nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, decodeBase64, encodeBase64 } from 'tweetnacl-util';
import * as bip39 from 'bip39';
import { Buffer } from 'buffer';
import type { Identity } from '../types';

// Helper to convert Uint8Array to Hex
const toHex = (data: Uint8Array) => Buffer.from(data).toString('hex');
const fromHex = (hex: string) => new Uint8Array(Buffer.from(hex, 'hex'));

export const generateIdentity = (): Identity => {
  try {
    const seed = nacl.randomBytes(32);
    const pair = nacl.sign.keyPair.fromSeed(seed);
    
    // Crypta-ID amigável
    const cryptaId = toHex(pair.publicKey).substring(0, 8).toUpperCase();
    
    // Master Key simplificada: Uma string alfanumérica única
    const masterKey = encodeBase64(seed);

    return {
      cryptaId,
      masterKey,
      publicKey: encodeBase64(pair.publicKey),
      secretKey: encodeBase64(pair.secretKey)
    };
  } catch (error) {
    console.error("Erro crítico ao gerar identidade:", error);
    throw error;
  }
};

export const restoreIdentity = (masterKey: string): Identity | null => {
  try {
    const seed = decodeBase64(masterKey);
    if (seed.length !== 32) return null;
    
    const pair = nacl.sign.keyPair.fromSeed(seed);
    const cryptaId = toHex(pair.publicKey).substring(0, 8).toUpperCase();

    return {
      cryptaId,
      masterKey,
      publicKey: encodeBase64(pair.publicKey),
      secretKey: encodeBase64(pair.secretKey)
    };
  } catch (e) {
    return null;
  }
};

// Simplified E2EE using authenticated symmetric encryption (nacl.secretbox)
// In a full implementation, we'd use X25519 for key exchange (nacl.box)
export const encryptMessage = (message: string, secretKeyHex: string): { ciphertext: string, nonce: string } => {
  const sharedKey = fromHex(secretKeyHex); // This should be a derived shared secret in real E2EE
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const messageUint8 = decodeUTF8(message);
  const box = nacl.secretbox(messageUint8, nonce, sharedKey);
  
  return {
    ciphertext: encodeBase64(box),
    nonce: encodeBase64(nonce)
  };
};

export const decryptMessage = (ciphertext: string, nonce: string, secretKeyHex: string): string | null => {
  const sharedKey = fromHex(secretKeyHex);
  const decodedNonce = decodeBase64(nonce);
  const decodedBox = decodeBase64(ciphertext);
  const decrypted = nacl.secretbox.open(decodedBox, decodedNonce, sharedKey);
  
  return decrypted ? encodeUTF8(decrypted) : null;
};
