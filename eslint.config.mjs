import nextConfig from "eslint-config-next";
import tsConfig from "eslint-config-next/typescript";

const config = [
  ...nextConfig,
  ...tsConfig,
  {
    ignores: [".next/"],
  },
];

export default config;
