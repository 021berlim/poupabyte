/** @type {import('next').NextConfig} */
const isCapacitorExport = process.env.CAPACITOR_EXPORT === "true"

const legacyRedirects = [
  ["/visao-geral", "/dashboard"],
  ["/movimentacoes", "/transactions"],
  ["/planejamento", "/cashflow"],
  ["/objetivos", "/goals"],
  ["/orcamentos", "/limits"],
  ["/patrimonio", "/investments"],
  ["/analises", "/reports"],
  ["/penny", "/assistant"],
  ["/categorias", "/categories"],
  ["/perfil", "/profile"],
  ["/perfil/seguranca", "/profile/security"],
  ["/perfil/preferencias", "/profile/preferences"],
  ["/perfil/privacidade", "/profile/privacy"],
].map(([source, destination]) => ({
  source,
  destination,
  permanent: true,
}))

const isVercel = process.env.VERCEL === "1"

const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  ...(isCapacitorExport
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {
        async redirects() {
          return legacyRedirects
        },
      }),
  typescript: {
    ignoreBuildErrors: !isVercel,
  },
  images: {
    unoptimized: isCapacitorExport,
  },
}

export default nextConfig