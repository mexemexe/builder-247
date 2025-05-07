import { createNonceMiddleware, generateNonce, ClientLibrary, NonceUtils } from '../../src/middleware/nonce';
import { Request, Response, NextFunction } from 'express';

describe('Nonce Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      headers: {},
      body: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('generateNonce', () => {
    it('should generate unique nonces for different libraries', () => {
      const axiosNonce = generateNonce(ClientLibrary.AXIOS);
      const fetchNonce = generateNonce(ClientLibrary.FETCH);
      const defaultNonce = generateNonce();
      
      expect(axiosNonce).not.toBe(fetchNonce);
      expect(axiosNonce).not.toBe(defaultNonce);
      expect(fetchNonce).not.toBe(defaultNonce);
    });

    it('should generate valid nonce formats', () => {
      const nonce = generateNonce();
      
      // Check nonce length and format
      expect(nonce).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/i.test(nonce)).toBe(true);
    });
  });

  describe('createNonceMiddleware', () => {
    it('should automatically inject nonce for mutating methods', () => {
      const middleware = createNonceMiddleware();
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      // Check that a nonce was injected
      expect(mockRequest.headers['x-nonce']).toBeDefined();
      expect(mockRequest.body.nonce).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should support library-specific nonce injection', () => {
      const axiosMiddleware = createNonceMiddleware({ 
        clientLibrary: ClientLibrary.AXIOS 
      });
      
      axiosMiddleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      // Check axios-specific nonce header
      expect(mockRequest.headers['x-axios-nonce']).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject request with invalid nonce format', () => {
      const middleware = createNonceMiddleware();
      
      mockRequest.headers = { 'x-nonce': 'invalid-nonce' };
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should reject repeated nonce', () => {
      const middleware = createNonceMiddleware();
      const nonce = generateNonce();
      
      // First request
      mockRequest.headers = { 'x-nonce': nonce };
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      // Reset mocks
      jest.clearAllMocks();
      
      // Second request with same nonce
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should allow GET request without nonce', () => {
      const middleware = createNonceMiddleware();
      
      mockRequest.method = 'GET';
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should support custom expiration time', () => {
      jest.useFakeTimers();
      
      const expirationTime = 1000; // 1 second
      const middleware = createNonceMiddleware({ expirationTime });
      const nonce = generateNonce();
      
      // First request
      mockRequest.headers = { 'x-nonce': nonce };
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      // Reset mocks
      jest.clearAllMocks();
      
      // Advance timer past expiration
      jest.advanceTimersByTime(expirationTime + 1);
      
      // Second request with same nonce after expiration
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('NonceUtils', () => {
    it('should export nonce utilities', () => {
      expect(NonceUtils.generateNonce).toBeDefined();
      expect(NonceUtils.createNonceMiddleware).toBeDefined();
    });
  });
});