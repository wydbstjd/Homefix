import { createApiClient } from "@/config/api";
import { useTheme } from "@/contexts/ThemeContext";
import SettingsModal from "@/components/SettingsModal";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const panelWidth = width * 0.7;

export default function ExploreScreen() {
  const { themeColors, fontSizeMultiplier, isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false); // 처음에는 모달 숨김
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecognitionFailed, setShowRecognitionFailed] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");
  const slideAnim = useRef(new Animated.Value(-panelWidth)).current; // 왼쪽에서 시작
  const modalFadeAnim = useRef(new Animated.Value(0)).current; // 모달 페이드 애니메이션
  const isFocused = useIsFocused();

  // 화면 포커스/블러 시 상태 초기화: 항상 깨끗한 시작 보장
  useFocusEffect(
    React.useCallback(() => {
      // 포커스될 때 초기화 (홈에서 진입 시 이전 상태 제거)
      setSelectedImageUri(null);
      setBase64Data(null);
      setIsLoading(false);
      setShowImagePicker(false);

      return () => {
        // 블러될 때도 초기화 (다음 진입 시 잔상 방지)
        setSelectedImageUri(null);
        setBase64Data(null);
        setIsLoading(false);
        setShowImagePicker(false);
      };
    }, [])
  );

  // 홈에서 버튼을 누르면 권한 확인 후 모달 표시
  useEffect(() => {
    if (!isFocused) return;
    if (params.showModal === "true") {
      // 권한 확인 후 모달 표시
      (async () => {
        const { status: cameraStatus } =
          await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraStatus !== "granted" || mediaStatus !== "granted") {
          Alert.alert("카메라 및 갤러리 접근 권한이 필요합니다.");
        } else {
          // 권한이 허용되면 모달 표시
          setShowImagePicker(true);
        }
      })();
    }
  }, [isFocused, params.showModal]);

  const convertToJpegBase64 = async (uri: string) => {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return result.base64;
  };

  const handleImagePick = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          base64: true,
          quality: 1,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        })
      : await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 1,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];

      try {
        const base64 = await convertToJpegBase64(asset.uri);
        setSelectedImageUri(asset.uri);
        setBase64Data(base64 || null);
        setShowImagePicker(false);
      } catch (err) {
        console.error("📛 이미지 처리 실패:", err);
        Alert.alert("이미지를 처리할 수 없습니다.");
      }
    }
  };

  const uploadImage = async () => {
    if (!base64Data || !selectedImageUri) return;

    setIsLoading(true);
    try {
      console.log("업로드할 base64 길이:", base64Data?.length);
      const apiClient = createApiClient();

      // 이미지 분석 -> 문제와 위치를 모두 예측
      const analyzeResponse = await apiClient.post("/analyze/", {
        image_base64: base64Data,
      });

      const { problem, location, message } =
        analyzeResponse.data || {};

      // Threshold 미달 시 (관련 없는 이미지)
      if (!problem || !location) {
        setFailedMessage(message || "사진을 다시 찍거나 채팅으로 물어보세요");
        setShowRecognitionFailed(true);
        // 모달 애니메이션 시작
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setIsLoading(false);
        return;
      }

      console.log(
        "분석 결과 - 문제:",
        problem,
        "위치:",
        location
      );

      // 바로 해결책 생성
      const solveResponse = await apiClient.post("/solve/", {
        problem,
        location,
      });

      const solutionData = solveResponse.data || {};
      console.log("📺 백엔드에서 받은 유튜브 데이터:", solutionData.youtube_videos);

      // 결과 화면으로 이동
      const params: any = {
        problem: solutionData.problem || problem,
        location,
        solution: solutionData.solution || "해결책 생성에 실패했습니다.",
        user_image_uri: selectedImageUri,
      };

      // 유튜브 데이터가 있으면 추가
      if (solutionData.youtube_videos && Array.isArray(solutionData.youtube_videos) && solutionData.youtube_videos.length > 0) {
        params.youtube_videos = JSON.stringify(solutionData.youtube_videos);
        console.log("📺 유튜브 데이터 전달:", params.youtube_videos);
      }

      router.replace({
        pathname: "/(tabs)/result",
        params,
      });
    } catch (error: any) {
      console.error("❌ axios 에러:", error?.message || error);
      Alert.alert("업로드 실패", "서버에 연결할 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setSelectedImageUri(null);
    setBase64Data(null);
    setShowImagePicker(true); // 이미지 선택 모달 다시 표시
  };

  const goBack = () => {
    router.replace("/");
  };

  const goToHome = () => {
    router.replace("/");
  };

  // 슬라이드 애니메이션 함수들
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

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={["top", "left", "right", "bottom"]}
      >
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

        {/* 이미지 미리보기 및 분석 결과 단계 */}
        {selectedImageUri && !isLoading && (
          <>
            <View
              style={[
                styles.header,
                { backgroundColor: themeColors.headerBackground },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: themeColors.text,
                    fontSize: 24 * fontSizeMultiplier,
                  },
                ]}
              >
                사진으로 물어보기
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: themeColors.text,
                    fontSize: 16 * fontSizeMultiplier,
                  },
                ]}
              >
                문제가 있는 곳을 사진으로 찍어서 정확한 해결책을 받아보세요
              </Text>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeImage}
                >
                  <Text
                    style={[
                      styles.removeButtonText,
                      { fontSize: 16 * fontSizeMultiplier },
                    ]}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 분석 버튼 */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={uploadImage}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.uploadButtonText,
                    { fontSize: 18 * fontSizeMultiplier },
                  ]}
                >
                  분석하기
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}

        {/* 로딩 화면 */}
        {isLoading && selectedImageUri && (
          <>
            <View
              style={[
                styles.header,
                { backgroundColor: themeColors.headerBackground },
              ]}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color: themeColors.text,
                    fontSize: 24 * fontSizeMultiplier,
                  },
                ]}
              >
                사진으로 물어보기
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: themeColors.text,
                    fontSize: 16 * fontSizeMultiplier,
                  },
                ]}
              >
                문제가 있는 곳을 사진으로 찍어서 정확한 해결책을 받아보세요
              </Text>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </View>

              <View
                style={[
                  styles.loadingContainer,
                  { backgroundColor: themeColors.cardBackground },
                ]}
              >
                <ActivityIndicator size="large" color="#007AFF" />
                <Text
                  style={[
                    styles.loadingText,
                    {
                      color: themeColors.text,
                      fontSize: 16 * fontSizeMultiplier,
                    },
                  ]}
                >
                  분석 중...
                </Text>
              </View>
            </ScrollView>
          </>
        )}

        {/* 이미지 선택 모달 */}
        <Modal
          visible={showImagePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImagePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: themeColors.cardBackground },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color: themeColors.text,
                    fontSize: 18 * fontSizeMultiplier,
                  },
                ]}
              >
                사진 선택
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleImagePick(true)}
              >
                <View style={styles.modalButtonContent}>
                  <Image
                    source={require("@/assets/images/camera.png")}
                    style={styles.modalIcon}
                  />
                  <Text
                    style={[
                      styles.modalButtonText,
                      {
                        color: themeColors.text,
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    촬영하기
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleImagePick(false)}
              >
                <View style={styles.modalButtonContent}>
                  <Image
                    source={require("@/assets/images/gallery.png")}
                    style={styles.modalIcon}
                  />
                  <Text
                    style={[
                      styles.modalButtonText,
                      {
                        color: themeColors.text,
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    갤러리에서 선택하기
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: isDarkMode ? "#ffffff" : "#f0f0f0" },
                  styles.backButton,
                ]}
                onPress={goBack}
              >
                <Text
                  style={[
                    styles.backButtonText,
                    {
                      color: isDarkMode ? "#000000" : "#333333",
                      fontSize: 16 * fontSizeMultiplier,
                    },
                  ]}
                >
                  뒤로가기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 설정 모달 */}
        <SettingsModal
          visible={showSettings}
          onClose={closeSettingsModal}
          slideAnim={slideAnim}
        />

        {/* 문제 인식 실패 커스텀 모달 */}
        <Modal
          visible={showRecognitionFailed}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            Animated.timing(modalFadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => setShowRecognitionFailed(false));
          }}
        >
          <Animated.View
            style={[
              styles.customModalOverlay,
              {
                opacity: modalFadeAnim,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.customModalBackdrop}
              activeOpacity={1}
              onPress={() => {
                Animated.timing(modalFadeAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: true,
                }).start(() => setShowRecognitionFailed(false));
              }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
                style={[
                  styles.customModalContent,
                  { backgroundColor: themeColors.cardBackground },
                ]}
              >
                {/* 아이콘 영역 */}
                <View style={styles.customModalIconContainer}>
                  <View
                    style={[
                      styles.customModalIconCircle,
                      { backgroundColor: "#ff6b6b" },
                    ]}
                  >
                    <View style={styles.customModalIconInner}>
                      <View style={styles.customModalIconLine1} />
                      <View style={styles.customModalIconLine2} />
                    </View>
                  </View>
                </View>

                {/* 제목 */}
                <Text
                  style={[
                    styles.customModalTitle,
                    {
                      color: themeColors.text,
                      fontSize: 22 * fontSizeMultiplier,
                    },
                  ]}
                >
                  문제를 인식하지 못했어요
                </Text>

                {/* 메시지 */}
                <Text
                  style={[
                    styles.customModalMessage,
                    {
                      color: themeColors.text,
                      fontSize: 16 * fontSizeMultiplier,
                    },
                  ]}
                >
                  {failedMessage}
                </Text>

                {/* 버튼 영역 */}
                <View style={styles.customModalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.customModalButton,
                      styles.customModalButtonSecondary,
                      { borderColor: themeColors.borderColor || "#e0e0e0" },
                    ]}
                    onPress={() => {
                      Animated.timing(modalFadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                      }).start(() => {
                        setShowRecognitionFailed(false);
                        setShowImagePicker(true);
                        setSelectedImageUri(null);
                        setBase64Data(null);
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.customModalButtonTextSecondary,
                        {
                          color: themeColors.text,
                          fontSize: 16 * fontSizeMultiplier,
                        },
                      ]}
                    >
                      다시 촬영
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.customModalButton,
                      styles.customModalButtonPrimary,
                    ]}
                    onPress={() => {
                      Animated.timing(modalFadeAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                      }).start(() => {
                        setShowRecognitionFailed(false);
                        router.push("/(tabs)/chat");
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.customModalButtonTextPrimary,
                        {
                          fontSize: 16 * fontSizeMultiplier,
                        },
                      ]}
                    >
                      채팅으로 문의
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
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
  // 이미지 선택 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
    tintColor: "#007AFF",
  },
  modalButtonText: {
    fontSize: 16,
  },
  backButton: {
    // backgroundColor는 동적으로 설정됨
  },
  backButtonText: {
    fontSize: 16,
    textAlign: "center",
  },
  // 커스텀 모달 스타일
  customModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  customModalBackdrop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  customModalContent: {
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
  customModalIconContainer: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  customModalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ff6b6b",
  },
  customModalIconInner: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  customModalIconLine1: {
    position: "absolute",
    width: 30,
    height: 4,
    backgroundColor: "white",
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  customModalIconLine2: {
    position: "absolute",
    width: 30,
    height: 4,
    backgroundColor: "white",
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
  customModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
  },
  customModalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
    opacity: 0.8,
  },
  customModalButtons: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  customModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  customModalButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  customModalButtonPrimary: {
    backgroundColor: "#007AFF",
  },
  customModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  customModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
