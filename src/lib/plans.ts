export const PLANS = {
  essential: {
    name: 'Essencial',
    price: 97,
    videosLimit: 20,
    viewsLimit: 1000,
    usersLimit: 1,
  },
  professional: {
    name: 'Profissional',
    price: 197,
    videosLimit: 60,
    viewsLimit: 5000,
    usersLimit: 3,
  },
  premium: {
    name: 'Premium',
    price: 497,
    videosLimit: 150,
    viewsLimit: 20000,
    usersLimit: 5,
  },
} as const;
