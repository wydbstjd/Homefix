import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");
const panelWidth = width * 0.85;

interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionModalProps {
  visible: boolean;
  onClose: () => void;
  slideAnim: Animated.Value;
  sessions: Session[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateNewSession: () => void;
  onOpenSettings?: () => void;
}

export default function SessionModal({
  visible,
  onClose,
  slideAnim,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateNewSession,
  onOpenSettings,
}: SessionModalProps) {
  const { themeColors, fontSizeMultiplier } = useTheme();

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return "오늘";
    } else if (days === 1) {
      return "어제";
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleOpenSettings = () => {
    onClose(); // 세션 모달 닫기
    if (onOpenSettings) {
      // 약간의 지연 후 설정 모달 열기
      setTimeout(() => {
        onOpenSettings();
      }, 100);
    }
  };

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
              styles.panel,
              {
                backgroundColor: `${themeColors.background}CC`,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <SafeAreaView
              style={styles.safeArea}
              edges={["top", "left", "right", "bottom"]}
            >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: themeColors.text,
                fontSize: 20 * fontSizeMultiplier,
              },
            ]}
          >
            채팅 세션
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text
              style={[
                styles.closeText,
                {
                  color: themeColors.text,
                  fontSize: 16 * fontSizeMultiplier,
                },
              ]}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.newSessionButton,
            {
              backgroundColor: themeColors.buttonBackground,
              marginBottom: 16,
            },
          ]}
          onPress={onCreateNewSession}
        >
          <Text
            style={[
              styles.newSessionText,
              {
                color: themeColors.text,
                fontSize: 16 * fontSizeMultiplier,
              },
            ]}
          >
            + 새 세션 시작
          </Text>
        </TouchableOpacity>

        <ScrollView 
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
          showsVerticalScrollIndicator={true}
        >
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: themeColors.text,
                    fontSize: 14 * fontSizeMultiplier,
                  },
                ]}
              >
                세션이 없습니다. 새 세션을 시작해보세요.
              </Text>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionItem,
                  {
                    backgroundColor:
                      session.id === currentSessionId
                        ? themeColors.cardBackground
                        : "transparent",
                    borderColor: themeColors.borderColor,
                  },
                ]}
                onPress={() => onSelectSession(session.id)}
              >
                <View style={styles.sessionContent}>
                  <Text
                    style={[
                      styles.sessionTitle,
                      {
                        color: themeColors.text,
                        fontSize: 16 * fontSizeMultiplier,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {session.title}
                  </Text>
                  <Text
                    style={[
                      styles.sessionDate,
                      {
                        color: themeColors.text,
                        fontSize: 12 * fontSizeMultiplier,
                        opacity: 0.6,
                      },
                    ]}
                  >
                    {formatDate(session.updatedAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDeleteSession(session.id)}
                >
                  <Text
                    style={[
                      styles.deleteText,
                      {
                        color: themeColors.text,
                        fontSize: 14 * fontSizeMultiplier,
                      },
                    ]}
                  >
                    삭제
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* 설정 버튼 */}
        <TouchableOpacity
          style={[
            styles.settingsButton,
            {
              backgroundColor: themeColors.buttonBackground,
              borderTopColor: themeColors.borderColor,
            },
          ]}
          onPress={handleOpenSettings}
        >
          <Text
            style={[
              styles.settingsButtonText,
              {
                color: themeColors.text,
                fontSize: 16 * fontSizeMultiplier,
              },
            ]}
          >
            설정
          </Text>
        </TouchableOpacity>
            </SafeAreaView>
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
  panel: {
    width: panelWidth,
    height: "100%",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    fontWeight: "300",
  },
  newSessionButton: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 12,
    alignItems: "center",
  },
  newSessionText: {
    fontWeight: "600",
  },
  sessionList: {
    flex: 1,
  },
  sessionListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  settingsButton: {
    padding: 16,
    borderTopWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    minHeight: 200,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.6,
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  sessionContent: {
    flex: 1,
    marginRight: 12,
  },
  sessionTitle: {
    fontWeight: "500",
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
  deleteText: {
    fontSize: 14,
    opacity: 0.7,
  },
});

