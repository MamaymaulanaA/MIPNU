import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Link dan router.push() diperiksa terhadap route yang benar-benar ada,
  // sehingga route mati tertangkap saat compile.
  typedRoutes: true,
  experimental: {
    // Hasil prefetch rute dinamis bawaannya langsung basi, sehingga setiap
    // klik memanggil server lagi walau muatannya sudah diambil. Terlihat di
    // log produksi: sidebar meng-prefetch 13 rute, lalu klik yang sebenarnya
    // tetap memicu render server penuh. Aman disimpan sebentar karena setiap
    // server action yang mengubah data memanggil revalidatePath.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
