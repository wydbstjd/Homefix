import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");
const panelWidth = width * 0.7;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
  showInquiry?: boolean;
}

export default function SettingsModal({
  visible,
  onClose,
  slideAnim,
  showInquiry = true,
}: SettingsModalProps) {
  const { themeColors, fontSize, setFontSize, isDarkMode, toggleDarkMode } =
    useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={[
              styles.settingsPanel,
              {
                backgroundColor: `${themeColors.background}CC`,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.settingsHeader,
                { borderBottomColor: themeColors.borderColor },
              ]}
            >
              <Text style={[styles.settingsTitle, { color: themeColors.text }]}>
                HomeFix
              </Text>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: themeColors.buttonBackground },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[styles.closeButtonText, { color: themeColors.text }]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsContent}>
              {/* 다크모드 */}
              <TouchableOpacity
                style={[
                  styles.settingsItem,
                  { borderBottomColor: themeColors.borderColor },
                ]}
                onPress={toggleDarkMode}
              >
                <View style={styles.settingsIcon}>
                  <View
                    style={[styles.sunIcon, { borderColor: themeColors.text }]}
                  />
                </View>
                <Text
                  style={[styles.settingsText, { color: themeColors.text }]}
                >
                  다크모드
                </Text>
                <View style={styles.toggleContainer}>
                  <View
                    style={[
                      styles.toggle,
                      { backgroundColor: themeColors.buttonBackground },
                      isDarkMode && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        isDarkMode && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 글자크기 */}
              <View
                style={[
                  styles.settingsItem,
                  { borderBottomColor: themeColors.borderColor },
                ]}
              >
                <View style={styles.settingsIcon}>
                  <View style={styles.fontIcon}>
                    <Text
                      style={[styles.fontText, { color: themeColors.text }]}
                    >
                      A
                    </Text>
                    <Text
                      style={[
                        styles.fontTextSmall,
                        { color: themeColors.text },
                      ]}
                    >
                      A
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.settingsText, { color: themeColors.text }]}
                >
                  글자크기
                </Text>
                <TouchableOpacity
                  style={[
                    styles.fontSizeButton,
                    { backgroundColor: themeColors.buttonBackground },
                    styles.fontSizeButtonActive,
                  ]}
                  onPress={() => {
                    const fontSizes: ("small" | "medium" | "large")[] = [
                      "small",
                      "medium",
                      "large",
                    ];
                    const currentIndex = fontSizes.indexOf(fontSize);
                    const nextIndex = (currentIndex + 1) % fontSizes.length;
                    setFontSize(fontSizes[nextIndex]);
                  }}
                >
                  <Text
                    style={[styles.fontSizeText, { color: themeColors.text }]}
                  >
                    {fontSize === "small"
                      ? "작게"
                      : fontSize === "medium"
                      ? "보통"
                      : "크게"}
                  </Text>
                </TouchableOpacity>
              </View>

              {showInquiry && (
                <TouchableOpacity
                  style={[
                    styles.settingsItem,
                    { borderBottomColor: themeColors.borderColor },
                  ]}
                >
                  <View style={styles.settingsIcon}>
                    <View style={styles.inquiryIcon}>
                      <View
                        style={[
                          styles.personIcon,
                          { backgroundColor: themeColors.text },
                        ]}
                      />
                      <View
                        style={[
                          styles.wrenchIcon,
                          { backgroundColor: themeColors.text },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[styles.settingsText, { color: themeColors.text }]}
                  >
                    문의하기
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  settingsPanel: {
    width: panelWidth,
    height: "100%",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666",
  },
  settingsContent: {
    padding: 20,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsText: {
    fontSize: 16,
    flex: 1,
  },
  toggleContainer: {
    marginLeft: "auto",
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "#007AFF",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  sunIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFA500",
  },
  fontIcon: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  fontText: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 2,
  },
  fontTextSmall: {
    fontSize: 12,
    fontWeight: "bold",
  },
  fontSizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    marginLeft: "auto",
  },
  fontSizeButtonActive: {
    backgroundColor: "#007AFF",
  },
  fontSizeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  inquiryIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  personIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 2,
  },
  wrenchIcon: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
});
