import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { readStored, writeStored } from "../src/storage";
import { createDemoApi } from "./engine";

const fileName = "handyhive-offline-demo-v1.json";
const webKey = fileName.replace(/\.json$/, "");

export const requestDemo = createDemoApi({
  async load() {
    if (Platform.OS === "web") return readStored(webKey, true);
    const file = new File(Paths.document, fileName);
    return file.exists ? file.text() : null;
  },
  async save(serialized) {
    if (Platform.OS === "web") {
      return writeStored(webKey, serialized, true);
    }
    const staged = new File(Paths.document, fileName + ".next");
    staged.create({ overwrite: true });
    await staged.write(serialized);
    await staged.move(new File(Paths.document, fileName), { overwrite: true });
  },
});
