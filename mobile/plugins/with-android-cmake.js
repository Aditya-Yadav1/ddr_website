const { withAppBuildGradle, withProjectBuildGradle } = require("expo/config-plugins");

module.exports = (config) => {
  config = withProjectBuildGradle(config, (result) => {
    const marker = "// HandyHive short native dependency paths";
    if (!result.modResults.contents.includes(marker)) result.modResults.contents += `
${marker}
subprojects { subproject ->
    subproject.plugins.withId("com.android.library") {
        subproject.androidComponents.finalizeDsl { androidDsl ->
            def appStage = System.getenv("HANDYHIVE_ANDROID_CMAKE_DIR")
            if (appStage) {
                androidDsl.externalNativeBuild.cmake.buildStagingDirectory = new File(new File(appStage).parentFile, subproject.name)
                androidDsl.defaultConfig.externalNativeBuild.cmake.arguments.add("-DCMAKE_OBJECT_PATH_MAX=245")
            }
        }
    }
}
`;
    return result;
  });
  return withAppBuildGradle(config, (result) => {
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
};
