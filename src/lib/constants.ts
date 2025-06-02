
// src/lib/constants.ts

export const USER_ROLES = {
  ADMIN: 'Admin',
  MARKETING_MANAGER: 'Pazarlama Müdürü',
  TEAM_MEMBER: 'Ekip Üyesi',
};

export const HOTEL_NAMES = [
  'Ali Bey Resort Sorgun',
  'Ali Bey Club & Park Manavgat',
  'BIJAL',
  'Ali Bey Hotels & Resorts', // Çatı marka
];

export const PROJECT_STATUSES = [
  'Planlama',
  'Devam Ediyor',
  'Beklemede',
  'Tamamlandı',
  'İptal Edildi',
];

export const TASK_STATUSES = [
  'Yapılacak',
  'Devam Ediyor',
  'Gözden Geçiriliyor',
  'Tamamlandı',
  'Engellendi',
];

export const TASK_PRIORITIES = [
  'Yüksek',
  'Orta',
  'Düşük',
];

export const CURRENCIES = ['EUR', 'TRY', 'USD'];

// SPENDING_CATEGORIES removed as it will be managed by Firestore

export const NAV_ITEMS = [
  { name: 'Kontrol Paneli', href: '/dashboard', icon: 'LayoutDashboard' },
  { name: 'Projeler', href: '/projects', icon: 'Briefcase' },
  { name: 'Görevler', href: '/tasks', icon: 'ListChecks' },
  { name: 'Takvim', href: '/calendar', icon: 'CalendarDays' },
  { name: 'Bütçe', href: '/budget', icon: 'Banknote' },
  { name: 'Raporlar', href: '/reports', icon: 'LineChart' },
];

export const ADMIN_NAV_ITEMS = [
  { name: 'Kullanıcı Yönetimi', href: '/user-management', icon: 'Users' },
  { name: 'Detaylı Raporlar', href: '/detailed-reports', icon: 'AreaChart' },
  { name: 'CMS', href: '/cms', icon: 'Settings2' },
];

