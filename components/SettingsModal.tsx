import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
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
  const { themeColors, fontSize, setFontSize, isDarkMode, toggleDarkMode, fontSizeMultiplier } =
    useTheme();
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const inquiryModalFadeAnim = useRef(new Animated.Value(0)).current;

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
                  onPress={() => {
                    setShowInquiryModal(true);
                    Animated.timing(inquiryModalFadeAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }).start();
                  }}
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

      {/* 문의하기 커스텀 모달 */}
      <Modal
        visible={showInquiryModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          Animated.timing(inquiryModalFadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => setShowInquiryModal(false));
        }}
      >
        <Animated.View
          style={[
            styles.inquiryModalOverlay,
            {
              opacity: inquiryModalFadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.inquiryModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Animated.timing(inquiryModalFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }).start(() => setShowInquiryModal(false));
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.inquiryModalContent,
                { backgroundColor: themeColors.cardBackground },
              ]}
            >
              {/* 아이콘 영역 */}
              <View style={styles.inquiryModalIconContainer}>
                <View
                  style={[
                    styles.inquiryModalIconCircle,
                    { backgroundColor: "#007AFF" },
                  ]}
                >
                  <Text style={styles.inquiryModalIconText}>✉️</Text>
                </View>
              </View>

              {/* 제목 */}
              <Text
                style={[
                  styles.inquiryModalTitle,
                  {
                    color: themeColors.text,
                    fontSize: 22 * fontSizeMultiplier,
                  },
                ]}
              >
                문의하기
              </Text>

              {/* 이메일 주소 */}
              <View style={styles.inquiryModalEmailContainer}>
                <Text
                  style={[
                    styles.inquiryModalEmailLabel,
                    {
                      color: themeColors.text,
                      fontSize: 14 * fontSizeMultiplier,
                    },
                  ]}
                >
                  이메일 주소
                </Text>
                <Text
                  style={[
                    styles.inquiryModalEmail,
                    {
                      color: "#007AFF",
                      fontSize: 18 * fontSizeMultiplier,
                    },
                  ]}
                >
                  homefix@gmail.com
                </Text>
              </View>

              {/* 메시지 */}
              <Text
                style={[
                  styles.inquiryModalMessage,
                  {
                    color: themeColors.text,
                    fontSize: 16 * fontSizeMultiplier,
                  },
                ]}
              >
                위 이메일 주소로 문의해주세요.
              </Text>

              {/* 버튼 영역 */}
              <View style={styles.inquiryModalButtons}>
                <TouchableOpacity
                  style={[
                    styles.inquiryModalButton,
                    styles.inquiryModalButtonSecondary,
                    { borderColor: themeColors.borderColor || "#e0e0e0" },
                  ]}
                  onPress={() => {
                    Animated.timing(inquiryModalFadeAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start(() => setShowInquiryModal(false));
                  }}
                >
                  <Text
                    style={[
                      styles.inquiryModalButtonTextSecondary,
                      {
                        color: themeColors.text,
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    닫기
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inquiryModalButton,
                    styles.inquiryModalButtonPrimary,
                  ]}
                  onPress={() => {
                    Linking.openURL("mailto:homefix@gmail.com").catch(() => {
                      // 이메일 앱을 열 수 없을 때는 그냥 모달만 닫기
                    });
                    Animated.timing(inquiryModalFadeAnim, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start(() => setShowInquiryModal(false));
                  }}
                >
                  <Text
                    style={[
                      styles.inquiryModalButtonTextPrimary,
                      {
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    이메일 앱 열기
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
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
  // 문의하기 모달 스타일
  inquiryModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inquiryModalBackdrop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  inquiryModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inquiryModalIconContainer: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  inquiryModalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  inquiryModalIconText: {
    fontSize: 48,
    lineHeight: 48,
    textAlign: "center",
  },
  inquiryModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  inquiryModalEmailContainer: {
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
  },
  inquiryModalEmailLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  inquiryModalEmail: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
  },
  inquiryModalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.8,
  },
  inquiryModalButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  inquiryModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inquiryModalButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  inquiryModalButtonPrimary: {
    backgroundColor: "#007AFF",
  },
  inquiryModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  inquiryModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
