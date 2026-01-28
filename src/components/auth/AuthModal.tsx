import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

const AuthModal = ({ visible, onClose }: AuthModalProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleSubmit = async () => {
    if (!email || !password || (mode === "signup" && !fullName)) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }

    const result =
      mode === "signin"
        ? await login(email, password)
        : await signup(email, password, fullName);

    if (result.error) {
      Alert.alert("Auth error", result.error.message);
      return;
    }

    Alert.alert("Success", mode === "signin" ? "Welcome back!" : "Check your email to verify your account.");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: 16 + insets.bottom,
            },
          ]}
        >
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tab,
                mode === "signin" && {
                  backgroundColor: colors.muted,
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => setMode("signin")}
            >
              <Text style={[styles.tabLabel, { color: colors.foreground }]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                mode === "signup" && {
                  backgroundColor: colors.muted,
                  borderColor: colors.primary,
                },
                { borderColor: colors.border },
              ]}
              onPress={() => setMode("signup")}
            >
              <Text style={[styles.tabLabel, { color: colors.foreground }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {mode === "signup" ? (
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="Full name"
              placeholderTextColor={colors.textSecondary}
              value={fullName}
              onChangeText={setFullName}
            />
          ) : null}

          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeLabel, { color: colors.textSecondary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tabLabel: {
    fontWeight: "600",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "700",
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  closeLabel: {
    fontSize: 12,
  },
});

export default AuthModal;
