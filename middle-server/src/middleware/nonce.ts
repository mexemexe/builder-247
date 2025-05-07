import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Nonce storage to prevent replay attacks
const usedNonces = new Set<string>();

// Nonce middleware configuration interface
interface NonceConfig {
  /**
   * Nonce expiration time in milliseconds
   * Default is 5 minutes (300000 ms)
   */
  expirationTime?: number;
  
  /**
   * Maximum number of nonces to store before cleaning
   * Default is 1000
   */
  maxNonceStorage?: number;
}

/**
 * Create a nonce middleware for API request validation
 * @param config Configuration options for nonce middleware
 * @returns Express middleware function
 */
export function createNonceMiddleware(config: NonceConfig = {}) {
  const {
    expirationTime = 300000, // 5 minutes default
    maxNonceStorage = 1000   // 1000 nonces default
  } = config;

  /**
   * Clean up old nonces to prevent memory growth
   */
  function cleanupNonces() {
    if (usedNonces.size > maxNonceStorage) {
      const nonceArray = Array.from(usedNonces);
      nonceArray.slice(0, nonceArray.length - maxNonceStorage).forEach(nonce => {
        usedNonces.delete(nonce);
      });
    }
  }

  /**
   * Nonce middleware function
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  return (req: Request, res: Response, next: NextFunction) => {
    // Only validate nonce for specific HTTP methods
    const methodsToValidate = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!methodsToValidate.includes(req.method)) {
      return next();
    }

    // Extract nonce from headers or body
    const nonce = req.headers['x-nonce'] as string || req.body?.nonce;

    // Validate nonce presence
    if (!nonce) {
      return res.status(400).json({ 
        error: 'Nonce is required for this request method' 
      });
    }

    // Validate nonce format (must be a valid SHA-256 hash)
    const nonceRegex = /^[a-f0-9]{64}$/i;
    if (!nonceRegex.test(nonce)) {
      return res.status(400).json({ 
        error: 'Invalid nonce format' 
      });
    }

    // Check if nonce has been used before
    if (usedNonces.has(nonce)) {
      return res.status(409).json({ 
        error: 'Nonce has already been used' 
      });
    }

    // Add nonce to used nonces
    usedNonces.add(nonce);

    // Schedule nonce cleanup
    setTimeout(() => {
      usedNonces.delete(nonce);
    }, expirationTime);

    // Perform periodic cleanup
    cleanupNonces();

    next();
  };
}

/**
 * Generate a secure nonce for API requests
 * @returns A 64-character hexadecimal nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}