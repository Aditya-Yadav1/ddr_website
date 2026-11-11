const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = (config) => withAppBuildGradle(config, (result) => {
  const marker = 'def handyHiveCmakeDirectory = System.getenv("HANDYHIVE_ANDROID_CMAKE_DIR")';
  const { contents, language } = result.modResults;
  if (contents.includes(marker)) return result;
  if (language !== "groovy" || !contents.includes("android {") || !contents.includes("defaultConfig {")) {
    throw new Error("Could not locate the Android Gradle blocks for CMake configuration.");
  }

  // Ninja on some Windows installations requires shorter object file paths.
  result.modResults.contents = contents.replace("android {", `android {
    ${marker}
    if (handyHiveCmakeDirectory) {
        externalNativeBuild {
            cmake { buildStagingDirectory file(handyHiveCmakeDirectory) }
        }
    }`).replace("defaultConfig {", `defaultConfig {
        if (handyHiveCmakeDirectory) {
            externalNativeBuild {
                cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=245" }
            }
        }`);
  return result;
});
