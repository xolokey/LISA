import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../../store/authStore';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid test noise
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
  (console.warn as jest.Mock).mockRestore();
});

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockAuthResponse = {
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: mockUser,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAuthResponse,
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password123' });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-jwt-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' }),
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.login({ email: 'test@example.com', password: 'wrongpassword' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: Response) => void;
      const loginPromise = new Promise<Response>((resolve) => {
        resolveLogin = resolve;
      });

      mockFetch.mockReturnValue(loginPromise);

      const { result } = renderHook(() => useAuthStore());

      act(() => {
        result.current.login({ email: 'test@example.com', password: 'password123' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin!({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic',
          url: 'http://localhost/api/auth/login',
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
          json: async () => ({
            message: 'Success',
            token: 'token',
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'user',
              createdAt: '2024-01-01T00:00:00Z',
            },
          }),
        } as Response);
        await loginPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      const mockAuthResponse = {
        message: 'Registration successful',
        token: 'mock-jwt-token',
        user: mockUser,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAuthResponse,
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-jwt-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should handle registration failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Email already exists' }),
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        try {
          await result.current.register({
            email: 'existing@example.com',
            password: 'password123',
            name: 'Test User',
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.user).toBe(null);
      expect(result.current.error).toBe('Email already exists');
    });
  });

  describe('Logout', () => {
    it('should logout and clear user data', async () => {
      // Set initial authenticated state
      useAuthStore.setState({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          createdAt: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Error handling', () => {
    it('should clear error when clearError is called', () => {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Some error',
      });

      const { result } = renderHook(() => useAuthStore());

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Token validation', () => {
    it('should check auth status with valid token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user' as const,
        createdAt: '2024-01-01T00:00:00Z',
      };

      // Set token in store
      useAuthStore.setState({
        token: 'stored-token',
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid token', async () => {
      useAuthStore.setState({
        token: 'invalid-token',
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Token expired' }),
        status: 401,
        statusText: 'Unauthorized',
      } as Response);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.checkAuthStatus();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.token).toBe(null);
      expect(result.current.user).toBe(null);
    });
  });
});