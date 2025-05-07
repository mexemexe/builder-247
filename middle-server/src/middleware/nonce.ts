import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Nonce storage mechanism
const usedNonces = new Set<string>();

// Enum for supported HTTP methods
enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

// API Client Libraries supported
export enum ClientLibrary {
  AXIOS = 'axios',
  FETCH = 'fetch',
  SUPERAGENT = 'superagent',
  DEFAULT = 'default'
}

// Nonce Middleware Configuration Interface
export interface NonceConfig {
  /**
   * Nonce expiration time in milliseconds
   * @default 5 minutes (300000 ms)
   */
  expirationTime?: number;

  /**
   * Maximum number of nonces to store
   * @default 1000
   */
  maxNonceStorage?: number;

  /**
   * Specify the client library for nonce handling
   * @default ClientLibrary.DEFAULT
   */
  clientLibrary?: ClientLibrary;

  /**
   * HTTP methods to protect with nonce validation
   * @default [POST, PUT, PATCH, DELETE]
   */
  protectedMethods?: HttpMethod[];
}

/**
 * Generate a cryptographically secure nonce
 * @param library Optional client library specification
 * @returns Secure nonce string
 */
export function generateNonce(
  library: ClientLibrary = ClientLibrary.DEFAULT
): string {
  const baseNonce = crypto.randomBytes(32).toString('hex');
  
  // Library-specific nonce generation for additional uniqueness
  switch (library) {
    case ClientLibrary.AXIOS:
      return crypto.createHash('sha256')
        .update(baseNonce + 'axios')
        .digest('hex');
    case ClientLibrary.FETCH:
      return crypto.createHash('sha256')
        .update(baseNonce + 'fetch')
        .digest('hex');
    case ClientLibrary.SUPERAGENT:
      return crypto.createHash('sha256')
        .update(baseNonce + 'superagent')
        .digest('hex');
    default:
      return baseNonce;
  }
}

/**
 * Create Nonce Middleware for API Request Validation
 * @param config Middleware configuration options
 * @returns Express middleware function
 */
export function createNonceMiddleware(config: NonceConfig = {}) {
  const {
    expirationTime = 300000, // 5 minutes
    maxNonceStorage = 1000,
    clientLibrary = ClientLibrary.DEFAULT,
    protectedMethods = [
      HttpMethod.POST, 
      HttpMethod.PUT, 
      HttpMethod.PATCH, 
      HttpMethod.DELETE
    ]
  } = config;

  /**
   * Clean up old nonces to prevent memory growth
   */
  function cleanupNonces(): void {
    if (usedNonces.size > maxNonceStorage) {
      const nonceArray = Array.from(usedNonces);
      nonceArray
        .slice(0, nonceArray.length - maxNonceStorage)
        .forEach(nonce => usedNonces.delete(nonce));
    }
  }

  /**
   * Determine the appropriate nonce header based on client library
   * @param library Client library type
   * @returns Nonce header name
   */
  function getNonceHeaderKey(library: ClientLibrary): string {
    switch (library) {
      case ClientLibrary.AXIOS:
        return 'x-axios-nonce';
      case ClientLibrary.FETCH:
        return 'x-fetch-nonce';
      case ClientLibrary.SUPERAGENT:
        return 'x-superagent-nonce';
      default:
        return 'x-nonce';
    }
  }

  /**
   * Middleware function for nonce validation and injection
   */
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip nonce validation for non-protected methods
    if (!protectedMethods.includes(req.method as HttpMethod)) {
      return next();
    }

    const nonceHeaderKey = getNonceHeaderKey(clientLibrary);
    const nonce = 
      req.headers[nonceHeaderKey] as string || 
      req.body?.nonce;

    // If no nonce exists, automatically generate and inject
    if (!nonce) {
      const newNonce = generateNonce(clientLibrary);
      req.headers[nonceHeaderKey] = newNonce;
      
      // Ensure body exists for nonce injection
      req.body = req.body || {};
      req.body.nonce = newNonce;
      
      return next();
    }

    // Validate nonce format
    const nonceRegex = /^[a-f0-9]{64}$/i;
    if (!nonceRegex.test(nonce)) {
      return res.status(400).json({ 
        error: 'Invalid nonce format',
        details: 'Nonce must be a 64-character hexadecimal string'
      });
    }

    // Check for replay attacks
    if (usedNonces.has(nonce)) {
      return res.status(409).json({ 
        error: 'Nonce already used',
        details: 'This nonce has been previously consumed'
      });
    }

    // Add nonce to used nonces
    usedNonces.add(nonce);

    // Schedule nonce cleanup
    setTimeout(() => {
      usedNonces.delete(nonce);
    }, expirationTime);

    // Periodic nonce cleanup
    cleanupNonces();

    next();
  };
}

// Utility export for consistency
export const NonceUtils = {
  generateNonce,
  createNonceMiddleware
};