const { withAndroidManifest, withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");
module.exports = (config, { pilotHost, packageSuffix = "" } = {}) => {
  if (pilotHost && !/^[\d.]+$/.test(pilotHost)) throw new Error("Pilot network requires a private IPv4 address.");
  const packageName = config.android.package + packageSuffix;
  config = withAppBuildGradle(config, (value) => {
    const { contents } = value.modResults;
    const applicationId = /(\bapplicationId\s+['"])([^'"]+)(['"])/;
    if (!applicationId.test(contents)) throw new Error("The application ID could not be configured.");
    value.modResults.contents = contents.replace(applicationId, (_, prefix, _id, quote) => prefix + packageName + quote);
    return value;
  });
  config = withAndroidManifest(config, (value) => {
    const app = value.modResults.manifest.application[0].$;
    app["android:usesCleartextTraffic"] = "false";
    app["android:networkSecurityConfig"] = "@xml/handyhive_network";
    app["android:allowBackup"] = "false";
    return value;
  });
  return withDangerousMod(config, ["android", async (value) => {
    const directory = path.join(value.modRequest.platformProjectRoot, "app/src/main/res/xml");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "handyhive_network.xml"), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config><base-config cleartextTrafficPermitted="false"/>
${pilotHost ? `<domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">${pilotHost}</domain></domain-config>` : ""}
</network-security-config>`);
    return value;
  }]);
};
