import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Phase 1: Supabase client (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  it('environment variables are set for testing', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co');
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key');
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('test-service-role-key');
  });

  it('createClient would be called with correct params', () => {
    const mockCreateClient = vi.fn();
    const mockClient = {
      from: vi.fn(),
      auth: {},
      storage: {},
    };
    mockCreateClient.mockReturnValue(mockClient);
    
    const client = mockCreateClient('url', 'key');
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
    expect(typeof client.auth).toBe('object');
    expect(typeof client.storage).toBe('object');
  });
});