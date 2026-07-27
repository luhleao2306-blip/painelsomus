import { useProfile as useProfileOriginal } from '@/hooks/use-profile';

export function useProfile() {
  try {
    return useProfileOriginal();
  } catch (e) {
    // Retorno de fallback para quando o hook é chamado fora do ProfileProvider (ex: rotas públicas)
    return {
      profile: null,
      loading: false,
      authReady: true,
      role: 'client',
      setRole: () => {},
      refreshProfile: async () => null,
      refreshProfileForUser: async () => null,
      updateProfile: async () => {},
    };
  }
}
