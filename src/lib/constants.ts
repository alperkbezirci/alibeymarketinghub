
// src/lib/constants.ts

export const USER_ROLES = {
  ADMIN: 'Admin',
  MARKETING_MANAGER: 'Pazarlama Müdürü',
  TEAM_MEMBER: 'Ekip Üyesi',
};

export const AUTHORIZATION_LEVELS = [
  'Seviye 1 (Temel Erişim)',
  'Seviye 2 (Orta Düzey Erişim)',
  'Seviye 3 (Gelişmiş Erişim)',
  'Tam Yetki (Yönetici)',
];

export const HOTEL_NAMES = [
  'Ali Bey Resort Sorgun',
  'Ali Bey Club & Park Manavgat',
  'BIJAL',
  'Ali Bey Hotels & Resorts', // Çatı marka
  'Genel Merkez', // Kurum için ek seçenek
];

// Moved from budget-config-service.ts to resolve 'use server' export error
export const MANAGED_BUDGET_HOTELS = ['Ali Bey Resort Sorgun', 'Ali Bey Club & Park Manavgat', 'BIJAL'];

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

export const NAV_ITEMS = [
  { name: 'Pazarlama Merkezi', href: '/dashboard', icon: 'LayoutDashboard' },
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

export const EVENT_TYPES = [
  'Organizasyon',
  'Turnuva',
  'Info/FamTrip',
  'Özel Misafir',
  'Influencer',
  'Basın',
  'Seyahat',
  'Salescall',
  'Fuar',
  'Toplantı',
];

