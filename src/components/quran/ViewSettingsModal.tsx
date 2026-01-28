import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { ThemeName } from "../../theme/themes";

interface ViewSettings {
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  showIntro: boolean;
}

interface ViewSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: ViewSettings;
  onSettingsChange: (settings: ViewSettings) => void;
  englishFontSize: number;
  arabicFontSize: number;
  onEnglishFontSizeChange: (size: number) => void;
  onArabicFontSizeChange: (size: number) => void;
  onResetFontSizes: () => void;
}

const ViewSettingsModal = ({
  visible,
  onClose,
  settings,
  onSettingsChange,
  englishFontSize,
  arabicFontSize,
  onEnglishFontSizeChange,
  onArabicFontSizeChange,
  onResetFontSizes,
}: ViewSettingsModalProps) => {
  const { colors, themeName, setThemeName } = useTheme();
  const insets = useSafeAreaInsets();
  const toggle = (key: keyof ViewSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingTop: 16 + insets.top,
            paddingBottom: 24 + insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            View settings
          </Text>
          <Pressable onPress={onClose}>
            <Text style={[styles.closeLabel, { color: colors.primary }]}>
              Done
            </Text>
          </Pressable>
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Font size
            </Text>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={onResetFontSizes}
            >
              <Text style={[styles.resetLabel, { color: colors.primary }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.fontLabel, { color: colors.textSecondary }]}>
            English
          </Text>
          <View style={styles.fontRow}>
            <Pressable
              style={[styles.fontButton, { borderColor: colors.border }]}
              onPress={() => onEnglishFontSizeChange(Math.max(12, englishFontSize - 1))}
            >
              <Text style={[styles.fontButtonLabel, { color: colors.foreground }]}>
                A-
              </Text>
            </Pressable>
            <Text style={[styles.fontValue, { color: colors.foreground }]}>
              {englishFontSize}
            </Text>
            <Pressable
              style={[styles.fontButton, { borderColor: colors.border }]}
              onPress={() => onEnglishFontSizeChange(Math.min(24, englishFontSize + 1))}
            >
              <Text style={[styles.fontButtonLabel, { color: colors.foreground }]}>
                A+
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.fontLabel, { color: colors.textSecondary }]}>
            Arabic
          </Text>
          <View style={styles.fontRow}>
            <Pressable
              style={[styles.fontButton, { borderColor: colors.border }]}
              onPress={() => onArabicFontSizeChange(Math.max(16, arabicFontSize - 1))}
            >
              <Text style={[styles.fontButtonLabel, { color: colors.foreground }]}>
                A-
              </Text>
            </Pressable>
            <Text style={[styles.fontValue, { color: colors.foreground }]}>
              {arabicFontSize}
            </Text>
            <Pressable
              style={[styles.fontButton, { borderColor: colors.border }]}
              onPress={() => onArabicFontSizeChange(Math.min(32, arabicFontSize + 1))}
            >
              <Text style={[styles.fontButtonLabel, { color: colors.foreground }]}>
                A+
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Theme
          </Text>
          <View style={styles.themeRow}>
            {(
              [
                { key: "default", label: "Default" },
                { key: "night", label: "Night" },
                { key: "sepia", label: "Sepia" },
                { key: "contrast", label: "Contrast" },
              ] as { key: ThemeName; label: string }[]
            ).map((t) => {
              const isActive = themeName === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.themeButton,
                    { borderColor: colors.border },
                    isActive && { borderColor: colors.primary, backgroundColor: colors.muted },
                  ]}
                  onPress={() => {
                    Vibration.vibrate(10);
                    setThemeName(t.key);
                  }}
                >
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isActive ? colors.primary : colors.foreground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: colors.border }]}>
          <SettingRow
            label="Arabic"
            value={settings.showArabic}
            onToggle={() => toggle("showArabic")}
            color={colors.foreground}
          />
          <SettingRow
            label="Translation"
            value={settings.showTranslation}
            onToggle={() => toggle("showTranslation")}
            color={colors.foreground}
          />
          <SettingRow
            label="Transliteration"
            value={settings.showTransliteration}
            onToggle={() => toggle("showTransliteration")}
            color={colors.foreground}
          />
          <SettingRow
            label="Surah introduction"
            value={settings.showIntro}
            onToggle={() => toggle("showIntro")}
            color={colors.foreground}
          />
        </View>
      </View>
    </Modal>
  );
};

const SettingRow = ({
  label,
  value,
  onToggle,
  color,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  color: string;
}) => {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={onToggle}
      >
        <View style={[styles.toggleDot, value && styles.toggleDotActive]} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  closeLabel: {
    color: "#60a5fa",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#a1a1aa",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  resetLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  fontLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  fontRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fontButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  fontButtonLabel: {
    fontSize: 14,
  },
  fontValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  themeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  rowLabel: {
    color: "#ffffff",
    fontSize: 15,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#1f1f1f",
    padding: 3,
  },
  toggleActive: {
    backgroundColor: "#60a5fa",
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  toggleDotActive: {
    marginLeft: 20,
  },
});

export default ViewSettingsModal;
