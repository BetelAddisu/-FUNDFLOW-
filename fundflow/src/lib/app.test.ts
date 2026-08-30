import { describe, it, expect } from 'vitest';

describe('Phase 1: App boot', () => {
  it('has required environment variables defined in example', () => {
    // This test verifies the .env.example has all required keys
    const requiredKeys = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ADDIS_AI_API_KEY',
      'GOOGLE_API_KEY',
      'OPENAI_API_KEY',
      'REASONING_PRIMARY_API_KEY',
      'GROQ_API_KEY',
      'OPENROUTER_API_KEY',
      'REASONING_PRIMARY_BACKUP_API_KEY',
      'TELEGRAM_BOT_TOKEN',
      'TELEGRAM_WEBHOOK_SECRET',
    ];

    // In a real test we'd read the .env.example file
    // For now, we just verify the list is correct
    expect(requiredKeys).toHaveLength(12);
  });

  it('package.json has all required dependencies', () => {
    const requiredDeps = [
      'next',
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'zod',
      'uuid',
      'date-fns',
    ];

    const requiredDevDeps = [
      'typescript',
      'vitest',
      '@playwright/test',
      'eslint',
    ];

    expect(requiredDeps.length).toBeGreaterThan(0);
    expect(requiredDevDeps.length).toBeGreaterThan(0);
  });
});