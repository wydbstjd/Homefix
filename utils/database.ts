import * as SQLite from "expo-sqlite";

// 전역 DB 인스턴스 (한 번만 열고 재사용)
let dbInstance: SQLite.SQLiteDatabase | null = null;

// DB 초기화 및 테이블 생성
export async function initDatabase(): Promise<void> {
  try {
    if (!dbInstance) {
      dbInstance = await SQLite.openDatabaseAsync("homefix_chat.db");
      
      // 세션 테이블 생성
      await dbInstance.execAsync(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      
      // 기존 메시지 테이블 마이그레이션 처리
      try {
        // 기존 테이블에 session_id 컬럼이 있는지 확인
        const tableInfo = await dbInstance.getAllAsync<any>(
          `PRAGMA table_info(chat_messages)`
        );
        
        if (tableInfo.length > 0) {
          // 테이블이 존재함
          const hasSessionId = tableInfo.some((col: any) => col.name === "session_id");
          
          if (!hasSessionId) {
            // 기존 데이터를 임시 테이블로 백업
            await dbInstance.execAsync(`
              CREATE TABLE chat_messages_backup AS SELECT * FROM chat_messages;
            `);
            
            // 기존 테이블 삭제
            await dbInstance.execAsync(`DROP TABLE chat_messages;`);
            
            // 새 테이블 생성 (session_id 포함)
            await dbInstance.execAsync(`
              CREATE TABLE chat_messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                text TEXT NOT NULL,
                is_user INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                reco_groups TEXT,
                youtube_videos TEXT,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
              );
            `);
            
            // 기본 세션 생성 (기존 메시지용)
            const defaultSessionId = "default_session";
            const now = Date.now();
            await dbInstance.runAsync(
              `INSERT OR IGNORE INTO chat_sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`,
              [defaultSessionId, "기존 대화", now, now]
            );
            
            // 백업된 데이터를 새 테이블로 복원 (기본 세션에 할당)
            try {
              const backupData = await dbInstance.getAllAsync<any>(
                `SELECT * FROM chat_messages_backup`
              );
              
              for (const row of backupData) {
                await dbInstance.runAsync(
                  `INSERT INTO chat_messages (id, session_id, text, is_user, timestamp, reco_groups, youtube_videos) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    row.id,
                    defaultSessionId,
                    row.text,
                    row.is_user,
                    row.timestamp,
                    row.reco_groups || null,
                    row.youtube_videos || null,
                  ]
                );
              }
            } catch (e) {
              console.log("백업 데이터 복원 실패 (무시됨):", e);
            }
            
            // 백업 테이블 삭제
            await dbInstance.execAsync(`DROP TABLE chat_messages_backup;`);
          }
        } else {
          // 테이블이 없으면 새로 생성
          await dbInstance.execAsync(`
            CREATE TABLE chat_messages (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              text TEXT NOT NULL,
              is_user INTEGER NOT NULL,
              timestamp INTEGER NOT NULL,
              reco_groups TEXT,
              youtube_videos TEXT,
              FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            );
          `);
        }
      } catch (e: any) {
        // 테이블이 없는 경우 또는 다른 오류 발생 시 새로 생성
        if (e.message && e.message.includes("no such table")) {
          await dbInstance.execAsync(`
            CREATE TABLE chat_messages (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              text TEXT NOT NULL,
              is_user INTEGER NOT NULL,
              timestamp INTEGER NOT NULL,
              reco_groups TEXT,
              youtube_videos TEXT,
              FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            );
          `);
        } else {
          // 다른 오류는 다시 throw
          throw e;
        }
      }
      
      // 인덱스 생성
      await dbInstance.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_messages_session_id ON chat_messages(session_id);
      `);
    }
  } catch (error) {
    console.error("DB 초기화 오류:", error);
    throw error;
  }
}

// DB 인스턴스 가져오기 (없으면 초기화)
async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    await initDatabase();
  }
  if (!dbInstance) {
    throw new Error("데이터베이스를 초기화할 수 없습니다.");
  }
  return dbInstance;
}

// 세션 생성
export async function createSession(title: string): Promise<string> {
  try {
    const db = await getDatabase();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    await db.runAsync(
      `INSERT INTO chat_sessions (id, title, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [sessionId, title, now, now]
    );
    
    return sessionId;
  } catch (error) {
    console.error("세션 생성 오류:", error);
    throw error;
  }
}

// 세션 목록 불러오기 (최신순)
export async function loadSessions(): Promise<any[]> {
  try {
    const db = await getDatabase();
    
    const result = await db.getAllAsync<any>(
      `SELECT * FROM chat_sessions ORDER BY updated_at DESC`
    );
    
    return result.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  } catch (error) {
    console.error("세션 목록 불러오기 오류:", error);
    return [];
  }
}

// 세션 업데이트 (제목 및 업데이트 시간)
export async function updateSession(sessionId: string, title?: string): Promise<void> {
  try {
    const db = await getDatabase();
    
    if (title) {
      await db.runAsync(
        `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`,
        [title, Date.now(), sessionId]
      );
    } else {
      await db.runAsync(
        `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
        [Date.now(), sessionId]
      );
    }
  } catch (error) {
    console.error("세션 업데이트 오류:", error);
  }
}

// 세션 삭제
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM chat_sessions WHERE id = ?`, [sessionId]);
  } catch (error) {
    console.error("세션 삭제 오류:", error);
  }
}

// 메시지 저장
export async function saveMessage(
  id: string,
  sessionId: string,
  text: string,
  isUser: boolean,
  timestamp: Date,
  recoGroups?: any,
  youtubeVideos?: any
): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.runAsync(
      `INSERT OR REPLACE INTO chat_messages (id, session_id, text, is_user, timestamp, reco_groups, youtube_videos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        text,
        isUser ? 1 : 0,
        timestamp.getTime(),
        recoGroups ? JSON.stringify(recoGroups) : null,
        youtubeVideos ? JSON.stringify(youtubeVideos) : null,
      ]
    );
    
    // 세션 업데이트 시간 갱신
    await updateSession(sessionId);
  } catch (error) {
    console.error("메시지 저장 오류:", error);
    // 저장 실패해도 앱은 계속 동작하도록 에러만 로그
  }
}

// 세션별 메시지 불러오기 (시간순)
export async function loadMessages(sessionId: string): Promise<any[]> {
  try {
    const db = await getDatabase();
    
    const result = await db.getAllAsync<any>(
      `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC`,
      [sessionId]
    );
    
    return result.map((row) => ({
      id: row.id,
      text: row.text,
      isUser: row.is_user === 1,
      timestamp: new Date(row.timestamp),
      recoGroups: row.reco_groups ? JSON.parse(row.reco_groups) : undefined,
      youtubeVideos: row.youtube_videos ? JSON.parse(row.youtube_videos) : undefined,
    }));
  } catch (error) {
    console.error("메시지 불러오기 오류:", error);
    return [];
  }
}

// 세션별 메시지 삭제
export async function clearMessages(sessionId: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM chat_messages WHERE session_id = ?`, [sessionId]);
  } catch (error) {
    console.error("메시지 삭제 오류:", error);
  }
}

// 특정 메시지 삭제
export async function deleteMessage(id: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM chat_messages WHERE id = ?`, [id]);
  } catch (error) {
    console.error("메시지 삭제 오류:", error);
  }
}
