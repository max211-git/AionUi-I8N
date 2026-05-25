import {
  findProviderConfigForBackend,
  getAionrsProviderPriority,
  matchProviderForBackend,
  selectPreferredAionrsProvider,
} from '@/common/config/providerSelection';
import { describe, expect, it } from 'vitest';

describe('providerSelection', () => {
  it('prefers openai-compatible providers first for aionrs', () => {
    const provider = selectPreferredAionrsProvider([
      { id: 'qwen-provider', platform: 'qwen', enabled: true },
      { id: 'openai-provider', platform: 'openai', enabled: true },
    ]);

    expect(provider?.id).toBe('openai-provider');
  });

  it('skips disabled providers when selecting the aionrs default', () => {
    const provider = selectPreferredAionrsProvider([
      { id: 'openai-disabled', platform: 'openai', enabled: false },
      { id: 'anthropic-enabled', platform: 'anthropic', enabled: true },
    ]);

    expect(provider?.id).toBe('anthropic-enabled');
  });

  it('falls back from codex to openai when reading backend health/config providers', () => {
    const provider = findProviderConfigForBackend(
      [
        { id: 'provider-1', platform: 'anthropic' },
        { id: 'provider-2', platform: 'openai-compatible' },
      ],
      'codex'
    );

    expect(provider?.id).toBe('provider-2');
  });

  it('falls back from codex to openai when matching configured providers by exact backend', () => {
    const provider = matchProviderForBackend(
      [
        { id: 'anthropic', platform: 'anthropic' },
        { id: 'openai', platform: 'openai' },
      ],
      'codex'
    );

    expect(provider?.id).toBe('openai');
  });

  it('orders unknown aionrs providers after known preferred platforms', () => {
    expect(getAionrsProviderPriority({ platform: 'openai' })).toBeLessThan(
      getAionrsProviderPriority({ platform: 'custom-gateway' })
    );
  });
});
