import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createHash } from 'crypto';

// Enum for API client libraries
export enum ClientLibrary {
  AXIOS = 'axios',
  FETCH = 'fetch',
  SUPERAGENT = 'superagent',
  DEFAULT = 'default'
}

// Nonce middleware configuration interface
export interface NonceConfig {
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

  /**
   * Specify the client library for nonce injection
   * Default is 'default'
   */
  clientLibrary?: ClientLibrary;
}

// Global nonce storage to prevent replay attacks
const usedNonces = new Set<string>();

/**
 * Generate a secure nonce for API requests
 * @param library Optional client library type
 * @returns A 64-character hexadecimal nonce
 */
export function generateNonce(library: ClientLibrary = ClientLibrary.DEFAULT): string {
  const baseNonce = crypto.randomBytes(32).toString('hex');
  
  // Optional library-specific nonce generation
  switch (library) {
    case ClientLibrary.AXIOS:
      return createHash('sha256').update(baseNonce + 'axios').digest('hex');
    case ClientLibrary.FETCH:
      return createHash('sha256').update(baseNonce + 'fetch').digest('hex');
    case ClientLibrary.SUPERAGENT:
      return createHash('sha256').update(baseNonce + 'superagent').digest('hex');
    default:
      return baseNonce;
  }
}

/**
 * Nonce injection middleware for different client libraries
 * @param config Configuration options for nonce middleware
 * @returns Express middleware function
 */
export function createNonceMiddleware(config: NonceConfig = {}) {
  const {
    expirationTime = 300000, // 5 minutes default
    maxNonceStorage = 1000,  // 1000 nonces default
    clientLibrary = ClientLibrary.DEFAULT
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
   * Inject nonce into request based on client library
   * @param req Express request object
   * @param nonce Generated nonce
   */
  function injectNonce(req: Request, nonce: string) {
    switch (clientLibrary) {
      case ClientLibrary.AXIOS:
        req.headers['x-axios-nonce'] = nonce;
        break;
      case ClientLibrary.FETCH:
        req.headers['x-fetch-nonce'] = nonce;
        break;
      case ClientLibrary.SUPERAGENT:
        req.headers['x-superagent-nonce'] = nonce;
        break;
      default:
        req.headers['x-nonce'] = nonce;
    }
  }

  /**
   * Nonce middleware function
   * @param req Express request
   * @param res Express response
   * @param next Express next function
   */
  return (req: Request, res: Response, next: NextFunction) => {
    // Only validate/inject nonce for specific HTTP methods
    const methodsToValidate = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!methodsToValidate.includes(req.method)) {
      return next();
    }

    // Extract nonce from headers or body
    const headerNonceKey = 
      clientLibrary === ClientLibrary.AXIOS ? 'x-axios-nonce' :
      clientLibrary === ClientLibrary.FETCH ? 'x-fetch-nonce' :
      clientLibrary === ClientLibrary.SUPERAGENT ? 'x-superagent-nonce' :
      'x-nonce';

    const nonce = req.headers[headerNonceKey] as string || req.body?.nonce;

    // If no nonce exists, generate and inject a new one
    if (!nonce) {
      const newNonce = generateNonce(clientLibrary);
      injectNonce(req, newNonce);
      req.body = req.body || {};
      req.body.nonce = newNonce;
    } else {
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
    }

    // Schedule nonce cleanup
    setTimeout(() => {
      usedNonces.delete(nonce || '');
    }, expirationTime);

    // Perform periodic cleanup
    cleanupNonces();

    next();
  };
}

// Export nonce-related utilities
export const NonceUtils = {
  generateNonce,
  createNonceMiddleware
};