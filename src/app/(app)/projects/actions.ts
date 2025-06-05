
// src/app/(app)/projects/actions.ts
// Bu dosyadaki server action'lar artık /src/app/(app)/projects/[id]/actions.ts altında
// daha spesifik ve güncel olarak yönetilmektedir.
// Bu dosya, gelecekteki bir refaktöring çalışmasında tamamen silinebilir.
// Şimdilik, yanlışlıkla kullanılmasını önlemek için içeriği temizlenmiştir.
"use server";

console.warn(
  "[DEPRECATION_WARNING] /src/app/(app)/projects/actions.ts dosyası artık kullanılmamalıdır. " +
  "İlgili server action'lar /src/app/(app)/projects/[id]/actions.ts altına taşınmıştır veya oradan kullanılmaktadır."
);

// Gelecekte bu dosyayı silmeyi düşünebilirsiniz.
// Eğer genel proje listesiyle ilgili (ID'den bağımsız) server action'lara ihtiyaç duyulursa,
// bu dosya yeniden yapılandırılabilir.
