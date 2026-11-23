const { resolveEndpoint } = require("./api-endpoint");
module.exports = ({ config }) => {
  const mode = process.env.EXPO_PUBLIC_HANDYHIVE_PILOT;
  const usb = mode === "usb";
  const pilot = usb || mode === "1";
  const offline = process.env.EXPO_PUBLIC_HANDYHIVE_OFFLINE_DEMO === "1";
  const pagesPath = process.env.HANDYHIVE_PAGES_BASE_PATH;
  const production = process.env.EAS_BUILD_PROFILE === "production" || process.env.HANDYHIVE_BUILD_CHANNEL === "production";
  if (production && (offline || pilot)) throw new Error("Production cannot enable demo or pilot mode.");
  if (offline && pilot) throw new Error("Choose either the offline demo or a network pilot.");
  if (process.env.HANDYHIVE_BUILD_CHANNEL || process.env.EAS_BUILD_PROFILE === "production") {
    if (!offline) resolveEndpoint(process.env.EXPO_PUBLIC_HANDYHIVE_API_URL, "android", false, usb ? "usb" : pilot);
  }
  return { ...config, ...(pilot && { name: usb ? "HandyHive USB Pilot" : "HandyHive Pilot", scheme: usb ? "handyhive-usb" : "handyhive-pilot" }),
    ...(offline && { name: "HandyHive Offline Demo", scheme: "handyhive-offline" }), version: offline ? "0.3.0" : "0.2.0",
    ...(offline && pagesPath && { experiments: { ...config.experiments, baseUrl: pagesPath } }),
    android: { ...config.android, versionCode: offline ? 3 : 2, allowBackup: false,
      ...(offline && { blockedPermissions: [...(config.android.blockedPermissions ?? []), "android.permission.INTERNET"] }) },
    plugins: [...config.plugins, ["./plugins/with-api-network", {
      pilotHost: pilot && process.env.EXPO_PUBLIC_HANDYHIVE_API_URL ? new URL(process.env.EXPO_PUBLIC_HANDYHIVE_API_URL).hostname : null,
      packageSuffix: offline ? ".demo" : usb ? ".pilot.usb" : pilot ? ".pilot" : "",
    }]] };
};
