import { createNonceMiddleware, generateNonce } from '../../src/middleware/nonce';
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
    it('should generate a valid nonce', () => {
      const nonce = generateNonce();
      
      // Check nonce length (64 characters)
      expect(nonce).toHaveLength(64);
      
      // Check nonce is hexadecimal
      expect(/^[a-f0-9]{64}$/i.test(nonce)).toBe(true);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('createNonceMiddleware', () => {
    it('should allow request with valid nonce in headers', () => {
      const middleware = createNonceMiddleware();
      const nonce = generateNonce();
      
      mockRequest.headers = { 'x-nonce': nonce };
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow request with valid nonce in body', () => {
      const middleware = createNonceMiddleware();
      const nonce = generateNonce();
      
      mockRequest.body = { nonce };
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject request without nonce', () => {
      const middleware = createNonceMiddleware();
      
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
});