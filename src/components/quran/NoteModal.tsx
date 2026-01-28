import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";

interface NoteModalProps {
  visible: boolean;
  title: string;
  initialValue?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

const NoteModal = ({ visible, title, initialValue, onSave, onClose }: NoteModalProps) => {
  const [value, setValue] = useState(initialValue || "");
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue, visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.background,
            paddingBottom: 16 + insets.bottom,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
          value={value}
          onChangeText={setValue}
          placeholder="Write your note..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <View style={styles.actions}>
          <Pressable style={[styles.cancel, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
          <Pressable
            style={[styles.save, { backgroundColor: colors.primary }]}
            onPress={() => {
              onSave(value);
              onClose();
            }}
          >
            <Text style={[styles.saveLabel, { color: colors.primaryForeground }]}>
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 12,
  },
  cancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelLabel: {
  },
  save: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveLabel: {
    fontWeight: "600",
  },
});

export default NoteModal;
