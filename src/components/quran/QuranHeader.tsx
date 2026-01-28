import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Vibration,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Surah } from "../../contexts/QuranContext";
import { useTheme } from "../../contexts/ThemeContext";

interface QuranHeaderProps {
  selectedSurah?: Surah;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onScrollToTop: () => void;
  onOpenAuth: () => void;
  topInset?: number;
  containerAnimatedStyle?: object;
  titleScale?: Animated.AnimatedInterpolation<number>;
  titleOpacity?: Animated.AnimatedInterpolation<number>;
  subtitleOpacity?: Animated.AnimatedInterpolation<number>;
}

const QuranHeader = ({
  selectedSurah,
  onOpenSidebar,
  onOpenSettings,
  onScrollToTop,
  onOpenAuth,
  topInset = 0,
  containerAnimatedStyle,
  titleScale,
  titleOpacity,
  subtitleOpacity,
}: QuranHeaderProps) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const showSubtitle = width >= 360;
  const handleScrollToTop = () => {
    Vibration.vibrate(10);
    onScrollToTop();
  };
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          height: 56 + topInset,
          paddingTop: topInset,
        },
        containerAnimatedStyle,
      ]}
    >
      <TouchableOpacity onPress={onOpenSidebar} style={styles.iconButton}>
        <Ionicons name="menu" size={18} color={colors.foreground} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.titleWrap} onPress={handleScrollToTop}>
        <Animated.Text
          style={[
            styles.title,
            {
              color: colors.foreground,
              transform: [{ scale: titleScale || 1 }],
              opacity: titleOpacity || 1,
            },
          ]}
        >
          {selectedSurah
            ? `${selectedSurah.transliteration} (${selectedSurah.number})`
            : "The Clear Quran®"}
        </Animated.Text>
        {selectedSurah && showSubtitle ? (
          <Animated.Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, opacity: subtitleOpacity || 1 },
            ]}
          >
            {selectedSurah.translation} • {selectedSurah.verses} verses
          </Animated.Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpenSettings} style={styles.iconButton}>
        <Ionicons name="settings-outline" size={18} color={colors.foreground} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onOpenAuth} style={styles.iconButton}>
        <Ionicons name="person-circle-outline" size={20} color={colors.foreground} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 10,
    marginTop: 2,
  },
});

export default QuranHeader;
