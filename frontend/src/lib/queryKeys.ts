export const queryKeys = {
  categories: (userId: string | undefined) => ['categories', userId] as const,
  transactions: (userId: string | undefined) => ['transactions', userId] as const,
  dashboard: (userId: string | undefined) => ['dashboard', userId] as const,
}
