declare module "*.css";
declare module "*.html";
declare module "*.svg" {
  const content: string;
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    PACKAGE_NAME?: string;
    MENTRAOS_API_KEY?: string;
    COOKIE_SECRET?: string;
    USERID?: string;
    OPENCLAW_GATEWAY_URL?: string;
    OPENCLAW_GATEWAY_TOKEN?: string;
  }
}
