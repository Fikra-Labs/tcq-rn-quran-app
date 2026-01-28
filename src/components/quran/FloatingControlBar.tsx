import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuranAudio } from "../../contexts/QuranAudioContext";
import { useTheme } from "../../contexts/ThemeContext";

interface FloatingControlBarProps {
  surahId: number;
  totalVerses: number;
  englishFontSize: number;
  arabicFontSize: number;
  onEnglishFontSizeChange: (size: number) => void;
  onArabicFontSizeChange: (size: number) => void;
  onResetFontSizes: () => void;
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  onDisplayToggle: (setting: string, value: boolean) => void;
  onPrevSurah: () => void;
  onNextSurah: () => void;
  currentSurah: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isCurrentVerseBookmarked: boolean;
  onToggleBookmark: () => void;
  currentStreak: number;
  completionPercentage: number;
  hasPremiumAccess: boolean;
  readingMode: "regular" | "thematic";
  onReadingModeChange: (mode: "regular" | "thematic") => void;
  hasThematicContent: boolean;
  onRequestUpgrade: () => void;
  isVisible: boolean;
}

const FloatingControlBar = ({
  surahId,
  totalVerses,
  englishFontSize,
  arabicFontSize,
  onEnglishFontSizeChange,
  onArabicFontSizeChange,
  onResetFontSizes,
  showArabic,
  showTranslation,
  showTransliteration,
  onDisplayToggle,
  onPrevSurah,
  onNextSurah,
  currentSurah,
  searchQuery,
  onSearchChange,
  isCurrentVerseBookmarked,
  onToggleBookmark,
  currentStreak,
  completionPercentage,
  hasPremiumAccess,
  readingMode,
  onReadingModeChange,
  hasThematicContent,
  onRequestUpgrade,
  isVisible,
}: FloatingControlBarProps) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [activeModal, setActiveModal] = useState<
    "audio" | "display" | "nav" | "search" | "progress" | "mode" | null
  >(null);

  const {
    playbackState,
    currentVerseKey,
    currentTime,
    duration,
    playSurah,
    pause,
    seekTo,
  } = useQuranAudio();

  const isPlaying = playbackState === "playing";
  const isLoading = playbackState === "loading";
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentVerseNumber = currentVerseKey
    ? parseInt(currentVerseKey.split(":")[1], 10)
    : 1;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      playSurah(surahId);
    }
  };

  const handlePrevious = () => {
    const targetVerse = Math.max(1, currentVerseNumber - 1);
    playSurah(surahId, targetVerse);
  };

  const handleNext = () => {
    const targetVerse = Math.min(totalVerses, currentVerseNumber + 1);
    playSurah(surahId, targetVerse);
  };

  const handleProgressChange = (value: number) => {
    const newTime = (value / 100) * duration;
    seekTo(newTime);
  };

  const toggleModal = (modal: typeof activeModal) => {
    setActiveModal(modal);
  };

  const readingModeOptions = useMemo(
    () => [
      { key: "regular", label: "Regular", description: "Verse by verse" },
      {
        key: "thematic",
        label: "Thematic",
        description: "Grouped with footnotes",
      },
    ],
    []
  );

  const translateY = useRef(new Animated.Value(90)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: isVisible ? 0 : 90,
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
    ]).start(() => {
      if (!isVisible) {
        setActiveModal(null);
      }
    });
  }, [isVisible, opacity, translateY]);

  return (
    <>
      <Animated.View
        style={[
          styles.bar,
          {
            bottom: insets.bottom + 6,
            backgroundColor: colors.background,
            borderColor: colors.border,
            transform: [{ translateY }],
            opacity,
          },
        ]}
        pointerEvents={isVisible ? "auto" : "none"}
      >
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border }]}
          onPress={() => toggleModal("audio")}
        >
          <Ionicons name="volume-high" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border }]}
          onPress={() => toggleModal("display")}
        >
          <Ionicons name="text" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border }]}
          onPress={() => toggleModal("nav")}
        >
          <Ionicons name="swap-horizontal" size={16} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: colors.border }]}
          onPress={() => toggleModal("progress")}
        >
          <Ionicons name="trending-up" size={16} color={colors.foreground} />
          {currentStreak > 0 ? (
            <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.streakText, { color: colors.primaryForeground }]}>
                {currentStreak}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        {hasThematicContent ? (
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => toggleModal("mode")}
          >
            <Ionicons
              name={readingMode === "thematic" ? "layers" : "list"}
              size={16}
              color={colors.foreground}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <ControlModal visible={activeModal === "audio"} onClose={() => setActiveModal(null)} title="Audio Player" colors={colors}>
        <Text style={[styles.modalMuted, { color: colors.textSecondary }]}>
          {currentVerseKey ? `Verse ${currentVerseKey.split(":")[1]}` : `Verse ${currentVerseNumber}`}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            {isLoading ? "Loading..." : isPlaying ? "Pause Surah" : "Play Surah"}
          </Text>
        </TouchableOpacity>
        <View style={styles.audioRow}>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={handlePrevious}
          >
            <Ionicons name="play-back" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.playMain,
              { borderColor: colors.primary, backgroundColor: colors.primary },
            ]}
            onPress={handlePlayPause}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={handleNext}
          >
            <Ionicons name="play-forward" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Slider
          minimumValue={0}
          maximumValue={100}
          value={progress}
          onValueChange={handleProgressChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
        />
      </ControlModal>

      <ControlModal visible={activeModal === "display"} onClose={() => setActiveModal(null)} title="Display Settings" colors={colors}>
        <View style={styles.rowBetween}>
          <Text style={[styles.modalLabel, { color: colors.foreground }]}>Font Size</Text>
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: colors.border }]}
            onPress={onResetFontSizes}
          >
            <Text style={[styles.resetLabel, { color: colors.primary }]}>Reset</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalMuted, { color: colors.textSecondary }]}>English</Text>
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onEnglishFontSizeChange(Math.max(12, englishFontSize - 2))}
          >
            <Ionicons name="remove" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalValue, { color: colors.primary }]}>{englishFontSize}</Text>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onEnglishFontSizeChange(Math.min(24, englishFontSize + 2))}
          >
            <Ionicons name="add" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalMuted, { color: colors.textSecondary, marginTop: 8 }]}>
          Arabic
        </Text>
        <View style={styles.rowGap}>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onArabicFontSizeChange(Math.max(16, arabicFontSize - 2))}
          >
            <Ionicons name="remove" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.modalValue, { color: colors.primary }]}>{arabicFontSize}</Text>
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={() => onArabicFontSizeChange(Math.min(32, arabicFontSize + 2))}
          >
            <Ionicons name="add" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <ToggleRow
          label="Show Arabic"
          value={showArabic}
          onToggle={(value) => onDisplayToggle("showArabic", value)}
        />
        <ToggleRow
          label="Show Translation"
          value={showTranslation}
          onToggle={(value) => onDisplayToggle("showTranslation", value)}
        />
        <ToggleRow
          label="Show Transliteration"
          value={showTransliteration}
          onToggle={(value) => onDisplayToggle("showTransliteration", value)}
        />
      </ControlModal>

      <ControlModal visible={activeModal === "nav"} onClose={() => setActiveModal(null)} title="Surah Navigation" colors={colors}>
        <Text style={[styles.modalMuted, { color: colors.textSecondary }]}>{currentSurah}</Text>
        <View style={styles.rowGap}>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={onPrevSurah}>
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={onNextSurah}>
            <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Next</Text>
          </TouchableOpacity>
        </View>
      </ControlModal>

      <ControlModal visible={activeModal === "search"} onClose={() => setActiveModal(null)} title="Search Verses" colors={colors}>
        <TextInput
          style={[styles.searchInput, { borderColor: colors.border, color: colors.foreground }]}
          placeholder="Search in this Surah..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </ControlModal>

      <ControlModal visible={activeModal === "progress"} onClose={() => setActiveModal(null)} title="Your Progress" colors={colors}>
        <View style={styles.rowBetween}>
          <Text style={[styles.modalLabel, { color: colors.foreground }]}>Current Streak</Text>
          <Text style={[styles.modalValue, { color: colors.primary }]}>{currentStreak} days</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.modalMuted, { color: colors.textSecondary }]}>
          Quran Completion: {completionPercentage}%
        </Text>
      </ControlModal>

      {hasThematicContent ? (
        <ControlModal visible={activeModal === "mode"} onClose={() => setActiveModal(null)} title="Reading Mode" colors={colors}>
          {readingModeOptions.map((option) => {
            const isSelected = readingMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.modeCard,
                  { borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, backgroundColor: colors.muted },
                ]}
                onPress={() => {
                  if (option.key === "thematic" && !hasPremiumAccess) {
                    onRequestUpgrade();
                  } else {
                    onReadingModeChange(option.key as "regular" | "thematic");
                    setActiveModal(null);
                  }
                }}
              >
                <Text style={[styles.modeTitle, { color: colors.foreground }]}>
                  {option.label} {option.key === "thematic" && !hasPremiumAccess ? "🔒" : ""}
                </Text>
                <Text style={[styles.modalMuted, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ControlModal>
      ) : null}
    </>
  );
};

const ToggleRow = ({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.rowBetween}>
      <Text style={[styles.modalLabel, { color: colors.foreground }]}>
        {label}
      </Text>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={() => onToggle(!value)}
      >
        <View style={[styles.toggleDot, value && styles.toggleDotActive]} />
      </TouchableOpacity>
    </View>
  );
};

const ControlModal = ({
  visible,
  onClose,
  title,
  children,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colors: { background: string; border: string; foreground: string };
}) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableOpacity style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.modalSheet,
          {
            backgroundColor: colors.background,
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>{children}</View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  streakBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#60a5fa",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  streakText: {
    color: "#0b0b0b",
    fontSize: 9,
    fontWeight: "700",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBody: {
    gap: 12,
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
  modalLabel: {
    color: "#ffffff",
    fontSize: 14,
  },
  modalValue: {
    color: "#60a5fa",
    fontWeight: "700",
  },
  modalMuted: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  audioRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  playMain: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#1f1f1f",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1f1f1f",
    padding: 2,
  },
  toggleActive: {
    backgroundColor: "#2563eb",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  toggleDotActive: {
    alignSelf: "flex-end",
  },
  modeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  modeCardActive: {
    backgroundColor: "rgba(96,165,250,0.12)",
  },
  modeTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
});

export default FloatingControlBar;
