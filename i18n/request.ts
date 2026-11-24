import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

// English only for now. When French and Arabic arrive, resolve the locale
// here (cookie or route segment) and load the matching messages file.
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
