type Env = Record<string, string | undefined>;

export type CaptchaConfig = {
  instanceUrl: string;
  siteKey: string;
  secret: string;
  enabled: boolean;
};

const normalizeUrl = (value: string) => value.trim().replace(/\/+$/, "");
const isDefined = (value: string) => Boolean(value && value !== "TO_DEFINE");

export const resolveCaptchaConfig = (env: Env): CaptchaConfig => {
  const instanceUrl = normalizeUrl(env.CAPTCHA_INSTANCE_URL ?? "");
  const siteKey = (env.CAPTCHA_SITE_KEY ?? "").trim();
  const secret = (env.CAPTCHA_SECRET ?? "").trim();
  const enabled = isDefined(instanceUrl) && isDefined(siteKey);

  return { instanceUrl, siteKey, secret, enabled };
};

export const injectCaptchaConfig = (html: string, config: CaptchaConfig) => {
  if (!html.includes("__CAPTCHA_INSTANCE_URL__")) {
    return html;
  }

  if (!config.enabled) {
    return html;
  }

  return html
    .replaceAll("__CAPTCHA_INSTANCE_URL__", config.instanceUrl)
    .replaceAll("__CAPTCHA_SITE_KEY__", config.siteKey);
};
