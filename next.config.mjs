/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // FundFlow runs without external services during the hackathon demo:
  // application data, evidence, and evaluation results live in local JSON
  // stores behind an adapter. AI providers are mocked behind the same
  // interface used by real providers (Addis AI, Google, local Whisper).
};

export default nextConfig;