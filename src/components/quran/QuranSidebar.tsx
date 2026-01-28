import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  Animated,
  Dimensions,
  Easing,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Surah, useQuran } from "../../contexts/QuranContext";
import { useTheme } from "../../contexts/ThemeContext";

interface QuranSidebarProps {
  visible: boolean;
  onClose: () => void;
  currentSurahNumber?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectSurah: (surahNumber: number) => void;
}

const QuranSidebar = ({
  visible,
  onClose,
  currentSurahNumber,
  searchQuery,
  onSearchChange,
  onSelectSurah,
}: QuranSidebarProps) => {
  const [activeTab, setActiveTab] = useState<"all" | "popular">("all");
  const { surahs, getPopularSurahs, isLoading, error } = useQuran();
  const popularSurahs = getPopularSurahs();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(288, Dimensions.get("window").width * 0.85);
  const translateX = useRef(new Animated.Value(-panelWidth)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const listRef = useRef<FlatList<Surah>>(null);
  const lastVisibleRef = useRef(false);
  const autoScrollHandledRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const [listReady, setListReady] = useState(false);
  const listHeightRef = useRef(0);

  const ITEM_HEIGHT = 72;

  useEffect(() => {
    if (visible) {
      lastVisibleRef.current = true;
      autoScrollHandledRef.current = false;
      hasUserScrolledRef.current = false;
      setListReady(false);
      setIsMounted(true);
      if (searchQuery) {
        onSearchChange("");
      }
      translateX.setValue(-panelWidth);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    lastVisibleRef.current = false;
    autoScrollHandledRef.current = false;
    hasUserScrolledRef.current = false;
    setListReady(false);
    Animated.timing(translateX, {
      toValue: -panelWidth,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsMounted(false);
    });
  }, [visible, panelWidth, translateX, searchQuery, onSearchChange]);

  const filteredSurahs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return surahs.filter(
      (surah) =>
        surah.transliteration.toLowerCase().includes(query) ||
        surah.translation.toLowerCase().includes(query) ||
        surah.name.includes(searchQuery) ||
        surah.number.toString().includes(searchQuery)
    );
  }, [surahs, searchQuery]);

  const displaySurahs = activeTab === "popular" ? popularSurahs : filteredSurahs;

  const tryAutoScroll = () => {
    if (!visible || !listReady || autoScrollHandledRef.current) return;
    if (hasUserScrolledRef.current) return;
    if (!currentSurahNumber) return;
    if (
      activeTab === "popular" &&
      !popularSurahs.some((surah) => surah.number.toString() === currentSurahNumber)
    ) {
      setActiveTab("all");
      return;
    }
    const targetIndex = displaySurahs.findIndex(
      (surah) => surah.number.toString() === currentSurahNumber
    );
    if (targetIndex === -1) return;
    const listHeight = listHeightRef.current || ITEM_HEIGHT * 6;
    const targetOffset =
      targetIndex * ITEM_HEIGHT - (listHeight / 2 - ITEM_HEIGHT / 2);
    const clampedOffset = Math.max(0, targetOffset);
    autoScrollHandledRef.current = true;
    InteractionManager.runAfterInteractions(() => {
      listRef.current?.scrollToOffset({
        offset: clampedOffset,
        animated: true,
      });
    });
  };

  useEffect(() => {
    if (!visible) return;
    autoScrollHandledRef.current = false;
    InteractionManager.runAfterInteractions(() => {
      setTimeout(tryAutoScroll, 60);
    });
  }, [visible, currentSurahNumber, displaySurahs, activeTab, popularSurahs, listReady]);

  const renderSurah = ({ item }: { item: Surah }) => {
    const isActive = currentSurahNumber === item.number.toString();
    return (
      <TouchableOpacity
        style={[
          styles.surahItem,
          isActive && styles.surahItemActive,
          isActive && { borderColor: colors.primary, backgroundColor: colors.muted },
        ]}
        onPress={() => {
          onSelectSurah(item.number);
          onClose();
        }}
      >
        <View style={[styles.badge, { backgroundColor: colors.muted }]}>
          <Text
            style={[
              styles.badgeText,
              { color: colors.textSecondary },
              isActive && { color: colors.primary },
            ]}
          >
            {item.number}
          </Text>
        </View>
        <View style={styles.surahText}>
          <View style={styles.surahRow}>
            <Text
              style={[
                styles.surahName,
                { color: colors.foreground },
                isActive && { color: colors.primary },
              ]}
            >
              {item.transliteration}
            </Text>
            <Text style={[styles.surahArabic, { color: colors.foreground }]}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.surahTranslation, { color: colors.textSecondary }]}>
            {item.translation}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isMounted) return null;

  return (
    <Modal visible={isMounted} animationType="none" transparent>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} />
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              transform: [{ translateX }],
              backgroundColor: colors.background,
              borderRightColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.panelContent,
              {
                paddingTop: 16 + insets.top,
                paddingBottom: 16 + insets.bottom,
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                The Clear Quran®
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { borderColor: colors.border },
                  activeTab === "all" && {
                    backgroundColor: colors.muted,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveTab("all")}
              >
                <Text style={[styles.tabText, { color: colors.foreground }]}>
                  All ({surahs.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  { borderColor: colors.border },
                  activeTab === "popular" && {
                    backgroundColor: colors.muted,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setActiveTab("popular")}
              >
                <Text style={[styles.tabText, { color: colors.foreground }]}>
                  Popular
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, { borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search surah..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={onSearchChange}
              />
            </View>

            {isLoading ? (
              <View style={styles.center}>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  Loading...
                </Text>
              </View>
            ) : error ? (
              <View style={styles.center}>
                <Text style={[styles.error, { color: "#ef4444" }]}>
                  Failed to load surahs.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={displaySurahs}
                keyExtractor={(item) => String(item.number)}
                renderItem={renderSurah}
                extraData={currentSurahNumber}
                onScrollBeginDrag={() => {
                  hasUserScrolledRef.current = true;
                  autoScrollHandledRef.current = true;
                }}
                onLayout={(event) => {
                  listHeightRef.current = event.nativeEvent.layout.height;
                  setListReady(true);
                }}
                onContentSizeChange={() => {
                  setListReady(true);
                }}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                onScrollToIndexFailed={({ averageItemLength, index }) => {
                  setTimeout(() => {
                    const listHeight = listHeightRef.current || ITEM_HEIGHT * 6;
                    const targetOffset =
                      index * ITEM_HEIGHT - (listHeight / 2 - ITEM_HEIGHT / 2);
                    const clampedOffset = Math.max(0, targetOffset);
                    listRef.current?.scrollToOffset({
                      offset: clampedOffset,
                      animated: true,
                    });
                  }, 50);
                }}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-start",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  panel: {
    flex: 1,
    height: "100%",
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  surahItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  surahItemActive: {
    backgroundColor: "rgba(96, 165, 250, 0.12)",
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: "#60a5fa",
  },
  surahText: {
    flex: 1,
  },
  surahRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  surahName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  surahNameActive: {
    color: "#60a5fa",
  },
  surahArabic: {
    fontSize: 16,
    fontFamily: "ScheherazadeNew_400Regular",
  },
  surahTranslation: {
    fontSize: 11,
    marginTop: 2,
  },
  center: {
    paddingVertical: 24,
    alignItems: "center",
  },
  muted: {
    color: "#9ca3af",
  },
  error: {
    color: "#ef4444",
  },
});

export default QuranSidebar;
