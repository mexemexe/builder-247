import { 
  createNonceMiddleware, 
  generateNonce, 
  ClientLibrary, 
  NonceUtils 
} from '../../src/middleware/nonce';
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
    it('should generate cryptographically secure nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      // Verify nonce characteristics
      expect(nonce1).toHaveLength(64);
      expect(nonce2).toHaveLength(64);
      expect(nonce1).not.toBe(nonce2);
      expect(/^[a-f0-9]{64}$/i.test(nonce1)).toBe(true);
    });

    it('should generate library-specific nonces', () => {
      const axiosNonce = generateNonce(ClientLibrary.AXIOS);
      const fetchNonce = generateNonce(ClientLibrary.FETCH);
      
      expect(axiosNonce).not.toBe(fetchNonce);
      expect(axiosNonce).toHaveLength(64);
      expect(fetchNonce).toHaveLength(64);
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

      // Verify nonce injection
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

      // Verify axios-specific nonce header
      expect(mockRequest.headers['x-axios-nonce']).toBeDefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should allow GET requests without nonce', () => {
      const middleware = createNonceMiddleware();
      mockRequest.method = 'GET';
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject invalid nonce format', () => {
      const middleware = createNonceMiddleware();
      mockRequest.headers = { 'x-nonce': 'invalid-nonce' };
      
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          error: 'Invalid nonce format',
          details: expect.any(String)
        })
      );
    });

    it('should prevent replay attacks', () => {
      const middleware = createNonceMiddleware();
      const reusedNonce = generateNonce();
      
      // First request with nonce
      mockRequest.headers = { 'x-nonce': reusedNonce };
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
        expect.objectContaining({ 
          error: 'Nonce already used',
          details: expect.any(String)
        })
      );
    });

    it('should handle custom protected methods', () => {
      const middleware = createNonceMiddleware({
        protectedMethods: ['POST']
      });
      
      mockRequest.method = 'POST';
      middleware(
        mockRequest as Request, 
        mockResponse as Response, 
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('NonceUtils', () => {
    it('should export utility functions', () => {
      expect(NonceUtils.generateNonce).toBeDefined();
      expect(NonceUtils.createNonceMiddleware).toBeDefined();
    });
  });
});