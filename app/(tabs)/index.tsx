import { useTheme } from "@/contexts/ThemeContext";
import SettingsModal from "@/components/SettingsModal";
import { router } from "expo-router";
import React, { useState, useRef } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const panelWidth = width * 0.7;

export default function HomeScreen() {
  const {
    isDarkMode,
    themeColors,
    fontSizeMultiplier,
  } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(-panelWidth)).current;

  const openSettingsModal = () => {
    setShowSettings(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSettingsModal = () => {
    Animated.timing(slideAnim, {
      toValue: -panelWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSettings(false);
    });
  };

  const handleImageAnalysis = () => {
    router.push({
      pathname: "/(tabs)/explore",
      params: { showModal: "true" },
    });
  };

  const handleChat = () => {
    router.push("/(tabs)/chat");
  };

  const goToHome = () => {
    // 이미 홈 화면이므로 아무것도 하지 않음
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={themeColors.background}
        />
        {/* 상단 메뉴 바 */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={openSettingsModal}
          >
            <View style={styles.menuIcon}>
              <View
                style={[styles.menuLine, { backgroundColor: themeColors.text }]}
              />
              <View
                style={[styles.menuLine, { backgroundColor: themeColors.text }]}
              />
              <View
                style={[styles.menuLine, { backgroundColor: themeColors.text }]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
            <View style={styles.homeIcon}>
              <View
                style={[
                  styles.homeRoof,
                  { borderBottomColor: themeColors.text },
                ]}
              />
              <View
                style={[styles.homeBase, { backgroundColor: themeColors.text }]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* 헤더 */}
        <View
          style={[
            styles.header,
            { backgroundColor: themeColors.headerBackground },
          ]}
        >
          <Text
            style={[
              styles.title,
              { color: themeColors.text, fontSize: 36 * fontSizeMultiplier },
            ]}
          >
            홈픽스
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: themeColors.text, fontSize: 16 * fontSizeMultiplier },
            ]}
          >
            집안 문제 해결 전문가
          </Text>
        </View>

        <View style={styles.content}>
          {/* 메인 선택 버튼들 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: themeColors.buttonBackground },
              ]}
              onPress={handleImageAnalysis}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require("@/assets/images/camera.png")}
                    style={[styles.buttonIcon, { tintColor: themeColors.text }]}
                  />
                </View>
                <Text
                  style={[
                    styles.buttonTitle,
                    {
                      color: themeColors.text,
                      fontSize: 20 * fontSizeMultiplier,
                    },
                  ]}
                >
                  사진으로 물어보기
                </Text>
                <Text
                  style={[
                    styles.buttonDescription,
                    {
                      color: themeColors.text,
                      fontSize: 14 * fontSizeMultiplier,
                    },
                  ]}
                >
                  문제가 있는 곳을 사진으로 찍어서{"\n"}정확한 해결책을
                  받아보세요
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: themeColors.buttonBackground },
              ]}
              onPress={handleChat}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require("@/assets/images/add-image.png")}
                    style={[styles.buttonIcon, { tintColor: themeColors.text }]}
                  />
                </View>
                <Text
                  style={[
                    styles.buttonTitle,
                    {
                      color: themeColors.text,
                      fontSize: 20 * fontSizeMultiplier,
                    },
                  ]}
                >
                  채팅으로 물어보기
                </Text>
                <Text
                  style={[
                    styles.buttonDescription,
                    {
                      color: themeColors.text,
                      fontSize: 14 * fontSizeMultiplier,
                    },
                  ]}
                >
                  궁금한 집안 문제를{"\n"}직접 질문해보세요
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 하단 안내 */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                { color: themeColors.text, fontSize: 14 * fontSizeMultiplier },
              ]}
            >
              💡 더 정확한 답변을 위해 구체적으로 질문해주세요
            </Text>
          </View>
        </View>

        {/* 설정 모달 */}
        <SettingsModal
          visible={showSettings}
          onClose={closeSettingsModal}
          slideAnim={slideAnim}
          showInquiry={true}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  spacer: {
    flex: 1,
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    width: 20,
    height: 15,
    justifyContent: "space-between",
  },
  menuLine: {
    height: 2,
    borderRadius: 1,
  },
  homeButton: {
    padding: 5,
  },
  homeIcon: {
    width: 20,
    height: 15,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: 2,
  },
  homeBase: {
    width: 12,
    height: 6,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  mainButton: {
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContent: {
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  buttonIcon: {
    width: 30,
    height: 30,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  buttonDescription: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
