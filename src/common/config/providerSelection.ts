type ProviderLike = {
  enabled?: boolean;
  platform?: string;
  id?: string;
};

const AIONRS_PLATFORM_PREFERENCE = ['openai', 'codex', 'anthropic', 'qwen', 'aws-bedrock', 'bedrock', 'ali-intl'];

const normalizeKey = (value?: string): string => value?.trim().toLowerCase() || '';

const getBackendCandidates = (backend?: string): string[] => {
  const normalizedBackend = normalizeKey(backend);
  if (!normalizedBackend) {
    return [];
  }
  if (normalizedBackend === 'codex') {
    return ['codex', 'openai'];
  }
  return [normalizedBackend];
};

export const getAionrsProviderPriority = (provider: Pick<ProviderLike, 'platform'>): number => {
  const platform = normalizeKey(provider.platform);
  const index = AIONRS_PLATFORM_PREFERENCE.findIndex((candidate) => platform.includes(candidate));
  return index === -1 ? AIONRS_PLATFORM_PREFERENCE.length : index;
};

export const selectPreferredAionrsProvider = <T extends Pick<ProviderLike, 'enabled' | 'platform'>>(
  providers: T[]
): T | undefined => {
  const enabledProviders = providers.filter((provider) => provider.enabled !== false);
  for (const candidate of AIONRS_PLATFORM_PREFERENCE) {
    const match = enabledProviders.find((provider) => normalizeKey(provider.platform).includes(candidate));
    if (match) {
      return match;
    }
  }
  return enabledProviders[0];
};

export const findProviderConfigForBackend = <T extends Pick<ProviderLike, 'platform'>>(
  providers: T[],
  backend?: string
): T | undefined => {
  for (const candidate of getBackendCandidates(backend)) {
    const match = providers.find((provider) => normalizeKey(provider.platform).includes(candidate));
    if (match) {
      return match;
    }
  }
  return undefined;
};

export const matchProviderForBackend = <T extends ProviderLike>(providers: T[], backend?: string): T | undefined => {
  for (const candidate of getBackendCandidates(backend)) {
    const match = providers.find(
      (provider) => normalizeKey(provider.platform) === candidate || normalizeKey(provider.id) === candidate
    );
    if (match) {
      return match;
    }
  }
  return undefined;
};
