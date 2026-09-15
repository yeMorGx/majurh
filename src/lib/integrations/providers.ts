export const integrationProviders = ['catho', 'solides', 'linkedin', 'indeed'] as const;

export type IntegrationProvider = (typeof integrationProviders)[number];
export type IntegrationStatus = 'disconnected' | 'pending' | 'connected' | 'error';

export const integrationProviderCatalog: Record<IntegrationProvider, {
  label: string;
  description: string;
  auth: 'token' | 'oauth2' | 'partner-oauth2';
  capabilities: Array<'publish-vacancies' | 'import-candidates' | 'sync-status'>;
}> = {
  catho: {
    label: 'Catho',
    description: 'Distribuição de vagas e entrada de candidatos conforme o contrato da conta Catho.',
    auth: 'token',
    capabilities: ['publish-vacancies', 'import-candidates'],
  },
  solides: {
    label: 'Sólides',
    description: 'Sincronização de currículos e pessoas usando o token de integração da Sólides.',
    auth: 'token',
    capabilities: ['import-candidates', 'sync-status'],
  },
  linkedin: {
    label: 'LinkedIn',
    description: 'Publicação e recebimento de candidaturas por programas aprovados do LinkedIn Talent Solutions.',
    auth: 'partner-oauth2',
    capabilities: ['publish-vacancies', 'import-candidates', 'sync-status'],
  },
  indeed: {
    label: 'Indeed',
    description: 'Distribuição de vagas e candidaturas por APIs disponíveis para parceiros ATS aprovados.',
    auth: 'partner-oauth2',
    capabilities: ['publish-vacancies', 'import-candidates', 'sync-status'],
  },
};

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return integrationProviders.includes(value as IntegrationProvider);
}
