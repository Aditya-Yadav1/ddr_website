import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { errorMessage } from "../src/api";
import { useSession } from "../src/session";
import { Body, Button, colors, Feedback, Heading, Page } from "../src/ui";

export default function SignIn() {
  const { login, error: sessionError } = useSession();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await login(handle, password); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Page>
    <Heading>Sign in to HandyHive</Heading>
    <Body>Username</Body>
    <TextInput accessibilityLabel="Username" testID="username" style={styles.input} value={handle} onChangeText={setHandle}
      autoCapitalize="none" autoCorrect={false} autoComplete="username" editable={!busy} />
    <Body>Password</Body>
    <TextInput accessibilityLabel="Password" testID="password" style={styles.input} value={password} onChangeText={setPassword}
      autoComplete="current-password" secureTextEntry editable={!busy} onSubmitEditing={() => {
        if (handle.trim() && password) void submit();
      }} />
    <Feedback message={error || sessionError} />
    <Button label={busy ? "Signing in…" : "Sign in"} onPress={() => void submit()} disabled={busy || !handle.trim() || !password} />
  </Page>;
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, color: colors.ink, padding: 12, fontSize: 16 },
});
