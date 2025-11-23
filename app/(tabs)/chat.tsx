import TypingText from "@/components/TypingText";
import { createApiClient } from "@/config/api";
import { useTheme } from "@/contexts/ThemeContext";
import SettingsModal from "@/components/SettingsModal";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { openBrowserAsync } from "expo-web-browser";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { renderFormattedText } from "@/utils/textFormatting";

interface RecoItem {
  title: string;
  price?: number | null;
  link: string;
  imageUrl?: string | null;
  rating?: number | null;
  ad?: boolean;
}

interface RecoGroup {
  group: string;
  required: boolean;
  items: RecoItem[];
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean; // 타이핑 효과 여부
  recoGroups?: RecoGroup[]; // 제품/준비물 추천 결과
  recoTyping?: boolean; // 제품 추천 타이핑 효과 여부
  recoItemsTyping?: boolean; // 제품 목록 타이핑 효과 여부
}

const { width } = Dimensions.get("window");
const panelWidth = width * 0.7;

export default function ChatScreen() {
  const { themeColors, fontSizeMultiplier } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "안녕하세요! 홈 수리 관련해서 도움이 필요하시면 언제든 말씀해주세요. 🏠",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(-panelWidth)).current; // 왼쪽에서 시작
  const scrollViewRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // 사용자 메시지 생성
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const apiClient = createApiClient();
      const response = await apiClient.post("/chat/", {
        message: inputText.trim(),
      });

      // 구체적인 질문일 때 준비물 정보 가져오기
      let recoGroups: RecoGroup[] = [];
      if (
        response.data.is_specific &&
        response.data.supplies &&
        response.data.supplies.length > 0
      ) {
        // backend에서 준비물 링크 정보 가져오기
        const requiredItems = response.data.supplies
          .filter((s: any) => s.type === "필수")
          .map((s: any) => ({
            title: s.keyword,
            link: s.link,
          }));
        const optionalItems = response.data.supplies
          .filter((s: any) => s.type === "선택")
          .map((s: any) => ({
            title: s.keyword,
            link: s.link,
          }));

        // RecoGroup 형식으로 변환
        if (requiredItems.length > 0) {
          recoGroups.push({
            group: "준비물(필수)",
            required: true,
            items: requiredItems,
          });
        }
        if (optionalItems.length > 0) {
          recoGroups.push({
            group: "준비물(선택)",
            required: false,
            items: optionalItems,
          });
        }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
        isTyping: true, // 타이핑 효과
        recoGroups: recoGroups.length > 0 ? recoGroups : undefined, // 제품 추천 정보
        recoTyping: recoGroups.length > 0, // 제품 추천도 타이핑 효과 적용
        recoItemsTyping: recoGroups.length > 0, // 제품 목록도 타이핑 효과 적용
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("채팅 에러:", error?.message || error);
      Alert.alert("오류", "메시지를 전송할 수 없습니다.");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.",
        isUser: false,
        timestamp: new Date(),
        isTyping: true, // 타이핑 효과
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInputText("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
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

        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.botMessage,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  {message.text &&
                    (message.isTyping && !message.isUser ? (
                      <TypingText
                        text={message.text}
                        speed={30}
                        style={[
                          styles.messageText,
                          message.isUser ? styles.userText : styles.botText,
                          {
                            color: themeColors.text,
                            fontSize: 16 * fontSizeMultiplier,
                          },
                        ]}
                        onComplete={() => {
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === message.id
                                ? { ...msg, isTyping: false }
                                : msg
                            )
                          );
                        }}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.messageText,
                          message.isUser ? styles.userText : styles.botText,
                          {
                            color: themeColors.text,
                            fontSize: 16 * fontSizeMultiplier,
                          },
                        ]}
                      >
                        {renderFormattedText(message.text, {
                          color: themeColors.text,
                          fontSize: 16 * fontSizeMultiplier,
                        })}
                      </Text>
                    ))}

                  {/* 제품 추천 렌더링 - 해결책 타이핑 완료 후에만 표시 */}
                  {!message.isUser &&
                    message.recoGroups &&
                    message.recoGroups.length > 0 &&
                    !message.isTyping && (
                      <View style={styles.recoContainer}>
                        {message.recoTyping ? (
                          <TypingText
                            text="💡 추천 준비물"
                            speed={50}
                            style={[
                              styles.recoTitle,
                              {
                                color: themeColors.text,
                                fontSize: 16 * fontSizeMultiplier,
                              },
                            ]}
                            onComplete={() => {
                              // 제품 추천 타이핑 완료 후 recoTyping을 false로 설정하고 제품 목록 타이핑 시작
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === message.id
                                    ? { ...msg, recoTyping: false }
                                    : msg
                                )
                              );
                            }}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.recoTitle,
                              {
                                color: themeColors.text,
                                fontSize: 16 * fontSizeMultiplier,
                              },
                            ]}
                          >
                            💡 추천 준비물
                          </Text>
                        )}
                        {!message.recoTyping && message.recoItemsTyping && (
                          <TypingText
                            text="준비물을 찾고 있습니다..."
                            speed={30}
                            style={{
                              color: themeColors.text,
                              fontSize: 14 * fontSizeMultiplier,
                              fontStyle: "italic",
                            }}
                            onComplete={() => {
                              // 제품 목록 타이핑 완료 후 recoItemsTyping을 false로 설정
                              setMessages((prev) =>
                                prev.map((msg) =>
                                  msg.id === message.id
                                    ? { ...msg, recoItemsTyping: false }
                                    : msg
                                )
                              );
                            }}
                          />
                        )}
                        {!message.recoTyping &&
                          !message.recoItemsTyping &&
                          message.recoGroups.map((g, idx) => (
                            <View
                              key={`${message.id}-g-${idx}`}
                              style={styles.recoGroup}
                            >
                              <Text
                                style={[
                                  styles.recoCategory,
                                  {
                                    color: themeColors.text,
                                    fontSize: 14 * fontSizeMultiplier,
                                  },
                                ]}
                              >
                                {g.required ? "필수" : "선택"}
                              </Text>
                              {g.items.map((it, jdx) => (
                                <Text
                                  key={`${message.id}-g-${idx}-i-${jdx}`}
                                  style={[
                                    styles.recoItem,
                                    {
                                      color: themeColors.text,
                                      fontSize: 14 * fontSizeMultiplier,
                                    },
                                  ]}
                                >
                                  {jdx + 1}. {it.title} -{" "}
                                  <Text
                                    style={[
                                      styles.recoLink,
                                      {
                                        color: "#3498db",
                                        fontSize: 14 * fontSizeMultiplier,
                                      },
                                    ]}
                                    onPress={() => openBrowserAsync(it.link)}
                                  >
                                    링크
                                  </Text>
                                </Text>
                              ))}
                            </View>
                          ))}
                      </View>
                    )}
                </View>
                <Text
                  style={[
                    styles.timestamp,
                    message.isUser ? styles.userTimestamp : styles.botTimestamp,
                    { color: themeColors.text },
                  ]}
                >
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))}

            {isLoading && (
              <View style={[styles.messageContainer, styles.botMessage]}>
                <View style={[styles.messageBubble, styles.botBubble]}>
                  <Text
                    style={[
                      styles.messageText,
                      styles.botText,
                      {
                        color: themeColors.text,
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    입력 중...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: themeColors.inputBackground,
                  color: themeColors.text,
                  fontSize: 16 * fontSizeMultiplier,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="홈 수리 관련 질문을 입력하세요..."
              placeholderTextColor={themeColors.text}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonText}>전송</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* 설정 모달 */}
        <SettingsModal
          visible={showSettings}
          onClose={closeSettingsModal}
          slideAnim={slideAnim}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: "flex-end",
  },
  botMessage: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "white",
  },
  botText: {},
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.6,
  },
  userTimestamp: {
    textAlign: "right",
  },
  botTimestamp: {
    textAlign: "left",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
  },
  sendButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // 제품 추천 스타일
  recoContainer: {
    marginTop: 8,
  },
  recoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  recoGroup: {
    marginBottom: 6,
  },
  recoCategory: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  recoItem: {
    fontSize: 14,
    marginLeft: 8,
    marginBottom: 2,
    lineHeight: 18,
  },
  recoLink: {
    textDecorationLine: "underline",
  },
  inquiryIcon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  personIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 2,
  },
  wrenchIcon: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
});
