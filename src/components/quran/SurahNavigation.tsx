import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";

interface SurahNavigationProps {
  currentSurah: number;
  totalSurahs: number;
  onNextSurah: () => void;
  onPrevSurah: () => void;
  isRTL: boolean;
  isVisible: boolean;
}

const SurahNavigation = ({
  currentSurah,
  totalSurahs,
  onNextSurah,
  onPrevSurah,
  isRTL,
  isVisible,
}: SurahNavigationProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 80,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: isVisible ? 1 : 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isVisible, opacity, translateY]);
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: 12 + insets.bottom,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents={isVisible ? "auto" : "none"}
    >
      <Pressable
        style={[
          styles.button,
          { borderColor: colors.border },
          currentSurah <= 1 && styles.buttonDisabled,
        ]}
        onPress={isRTL ? onNextSurah : onPrevSurah}
        disabled={currentSurah <= 1}
      >
        <Text style={[styles.buttonText, { color: colors.foreground }]}>
          Prev
        </Text>
      </Pressable>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Surah {currentSurah} / {totalSurahs}
      </Text>
      <Pressable
        style={[
          styles.button,
          { borderColor: colors.border },
          currentSurah >= totalSurahs && styles.buttonDisabled,
        ]}
        onPress={isRTL ? onPrevSurah : onNextSurah}
        disabled={currentSurah >= totalSurahs}
      >
        <Text style={[styles.buttonText, { color: colors.foreground }]}>
          Next
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
  },
});

export default SurahNavigation;
