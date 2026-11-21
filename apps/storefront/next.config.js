const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  skipTrailingSlashRedirect: true,
  outputFileTracingIncludes: {
    "/[countryCode]/inspiration/[slug]": ["./public/vibeya/inspiration/story.html"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Link", value: '</.well-known/ucp>; rel="ucp"' }],
      },
      {
        source: "/:countryCode/products/:handle",
        headers: [{ key: "Vary", value: "Accept" }],
      },
    ]
  },
  async redirects() {
    const markets = ["ca", "jp", "mx", "us"]
    return [
      ...markets.map((countryCode) => ({
        source: "/vibeya/inspiration/story.html",
        has: [
          { type: "query", key: "inspiration", value: "mushroom-night-garden-wallet" },
          { type: "query", key: "country", value: countryCode },
        ],
        destination: `/${countryCode}/inspiration/mushroom-night-garden-wallet`,
        permanent: true,
      })),
      {
        source: "/vibeya/inspiration/story.html",
        has: [{ type: "query", key: "inspiration", value: "mushroom-night-garden-wallet" }],
        missing: [{ type: "query", key: "country" }],
        destination: "/us/inspiration/mushroom-night-garden-wallet",
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:countryCode/products/:handle([^/.]+).md",
          destination: "/:countryCode/products/:handle/markdown",
        },
        {
          source: "/:countryCode/products/:handle([^/.]+)",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/:countryCode/products/:handle/markdown",
        },
      ],
    }
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
