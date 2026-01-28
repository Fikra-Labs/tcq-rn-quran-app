import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surah } from "../../contexts/QuranContext";

interface QuranLayoutProps {
  children: React.ReactNode;
  selectedSurah?: Surah;
  onOpenSettings: () => void;
}

const QuranLayout = ({ children, selectedSurah, onOpenSettings }: QuranLayoutProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {selectedSurah ? selectedSurah.transliteration : "Read The Clear Quran"}
          </Text>
          {selectedSurah ? (
            <Text style={styles.subtitle}>
              {selectedSurah.translation} • Surah {selectedSurah.number}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
          <Text style={styles.settingsLabel}>Aa</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b0b0b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1f1f1f",
    backgroundColor: "#0b0b0b",
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 2,
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2b2b2b",
  },
  settingsLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});

export default QuranLayout;
