from openai import OpenAI
import os
from dotenv import load_dotenv

# .env 파일에서 OPENAI_API_KEY 불러오기
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_answer(question, context):
    """GPT를 사용해서 최종 답변 생성"""
    prompt = f"""
        당신은 유능한 AI 어시스턴트입니다. 반드시 아래 문맥(Context)에 기반하여 답변해주세요.
        문맥에 없는 내용은 상상하지 말고, 모르면 모른다고 말하세요.
        📌 문맥의 내용을 요약하지 말고, 단계별로 구체적으로 설명해주세요.
        특히 "해결 방법", "예방 팁"을 빠짐없이 반영하여 설명해주세요.
        
        ⚠️ 중요: 답변 작성 시 다음 형식을 지켜주세요:
        - #, ##, ### 같은 마크다운 헤딩(제목 표시)을 사용하지 마세요
        - 대신 **굵은 글씨**를 사용하여 강조만 해주세요
        - 예시: "**변기 막힘 해결법**" (O), "# 변기 막힘 해결법" (X)

        [문맥 정보]
        {context}

        [질문]
        {question}
        """.strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            { "role": "system", "content": "친절한 한국어 홈케어 전문가입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=2048
    )
    return response.choices[0].message.content.strip()

def is_relevant_question(question):
    """GPT를 사용해서 질문이 집안 오염/문제 관련인지 판단"""
    
    prompt = f"""다음 질문이 집안 오염이나 문제 해결과 관련이 있는지 판단해주세요.

📌 **집안 오염/문제 관련 질문 판단 기준:**

**✅ 관련 있음: 다음 중 하나라도 해당**
1. **오염 문제**: 기름때, 물때, 곰팡이, 얼룩, 녹, 변색 등 제거/해결
2. **집안 손상**: 깨짐, 찢어짐, 스크래치, 벗겨짐 등 수리/해결
3. **기능 이상**: 막힘, 소음, 악취, 불량, 고장 등 해결
4. **집안 관련 위치/대상**: 주방, 화장실, 가전제품, 가구, 벽지, 타일, 배관 등 집안 요소의 문제
5. **해충/생물**: 개미, 바퀴벌레, 모기, 곰팡이 등 제거
6. **집안 관리**: 청소, 유지보수, 관리 방법

**❌ 관련 없음: 다음에 해당하는 경우**
- 학습, 공부, 시험, 교육 관련
- 요리 레시피, 음식 만들기
- 건강, 의료, 병원, 증상 관련
- 직업, 취업, 면접, 회사 관련
- 여행, 관광, 숙박 관련
- 스포츠, 게임, 취미, 오락 관련
- 정치, 경제, 사회 이슈 관련
- 날씨, 뉴스, 시사 관련
- 일반적인 상식 질문 (집안 문제가 아닌)

**관련 있음 예시:**
- "후라이팬 기름때 제거" ✅
- "변기 막힘 해결법" ✅
- "곰팡이 제거 방법" ✅
- "종이벽지 오염 제거" ✅
- "세탁기 소음 해결" ✅

**관련 없음 예시:**
- "파이썬 공부 방법" ❌
- "김치찌개 만드는 법" ❌
- "감기 증상이 뭐야" ❌
- "취업 준비 어떻게 해" ❌
- "제주도 여행 코스" ❌
- "날씨가 어때" ❌

**현재 질문:** "{question}"

위 기준으로 판단하여 **"관련있음"** 또는 **"관련없음"** 중 하나로만 답변해주세요.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "집안 오염 및 문제 해결 관련 질문인지 판단하는 전문가입니다. '관련있음' 또는 '관련없음' 중 하나로만 답변합니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    result = response.choices[0].message.content.strip().lower()
    
    return result == "관련있음" or result == "관련 있음"

def is_specific_question(question, conversation_context=""):
    """GPT를 사용해서 문맥을 고려한 구체성 판단"""
    
    context_prompt = ""
    if conversation_context:
        context_prompt = f"""
[이전 대화 내용]
{conversation_context}

"""
    
    prompt = f"""{context_prompt}다음 질문이 구체적인지 판단해주세요.

📌 **구체적인 질문 판단 기준** (homefix.md 기준):

**✅ 구체적: 다음 2개 조건을 모두 충족**
1. **구체적인 대상/장소** 명시
   - 가전제품: 전자레인지, 가습기, 세탁기, 에어컨, 공기청정기 등
   - 주방: 가스레인지, 후라이팬, 냄비, 싱크대, 인덕션 등
   - 화장실: 변기, 수전, 샤워기, 수도꼭지 등
   - 가구: 문, 목재 가구, 방충망 등
   - 벽지: 종이벽지, 벽지 등
   - 기타: 쌀, 고구마, 개미, 바퀴벌레 등

2. **구체적인 문제** 명시
   - 오염: 기름때, 물때, 곰팡이, 얼룩, 녹 등
   - 기능 이상: 막힘, 소음, 악취, 불량 등
   - 기타: 찢어짐, 삐걱거림, 결로 등

**❌ 애매함: 다음 중 하나라도 불충족**
- 대상만 있고 문제가 없음
- 문제만 있고 대상이 불명확함
- "청소", "수리", "해결" 같은 일반적 표현만 사용

**구체적 예시:**
- "변기 막힘 해결법" ✅ (변기 + 막힘)
- "후라이팬 기름때 제거" ✅ (후라이팬 + 기름때)
- "수전 물때 해결법" ✅ (수전 + 물때)
- "종이벽지 곰팡이 제거" ✅ (종이벽지 + 곰팡이)
- "가습기 가습량 부족" ✅ (가습기 + 가습량 부족)
- "문 삐걱거림" ✅ (문 + 삐걱거림)

**애매함 예시:**
- "기름때 제거법" ❌ (어디의 기름때?)
- "화장실 청소" ❌ (무엇을, 어떤 방법으로?)
- "막힘 해결법" ❌ (무엇이 막혔나요?)
- "수리 방법" ❌ (무엇을 수리하나요?)
- "곰팡이 제거" ❌ (어디의 곰팡이인가요?)

**현재 질문:** "{question}"

위 기준으로 판단하여 **"구체적"** 또는 **"애매함"** 중 하나로만 답변해주세요.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "홈케어 질문의 구체성을 판단하는 전문가입니다. 이전 대화 내용을 고려하여 판단하고, '구체적' 또는 '애매함' 중 하나로만 답변합니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    result = response.choices[0].message.content.strip().lower()
    
    return result == "구체적"

def generate_clarification_question(question):
    """GPT를 사용해서 추가 질문 생성"""
    
    prompt = f"""
다음 질문이 애매하므로 구체적인 정보가 필요합니다. 사용자에게 추가 질문을 생성해주세요.

질문: "{question}"

⚠️ 중요한 규칙:
- 사용자가 이미 구체적인 대상/표면(예: 벽지, 후라이팬, 변기, 수전 등)을 언급했다면, 다시 위치를 물어보지 마세요.
- 필요한 정보만 물어보세요.

다음 기준에 따라 추가 질문을 생성해주세요:

**1. 대상은 명시되었지만 문제가 애매한 경우 → 문제의 구체적인 종류만 물어보기**
예시:
- "벽지가 더러워" → "벽지가 어떻게 더러워졌나요? (곰팡이, 얼룩, 기름때 등 구체적인 문제를 알려주세요.)"
- "후라이팬이 안 좋아" → "후라이팬에 어떤 문제가 있나요? (기름때, 눌어붙음, 코팅 벗겨짐 등)"
- "변기 문제" → "변기에 어떤 문제가 발생했나요? (막힘, 물때, 냄새 등)"

**2. 문제는 명시되었지만 대상이 애매한 경우 → 어디서 발생했는지만 물어보기**
예시:
- "기름때 제거법" → "어디의 기름때를 제거하고 싶으신가요? (후라이팬, 가스레인지, 벽지 등)"
- "곰팡이 제거" → "어디에 곰팡이가 생겼나요? (벽지, 화장실, 타일 등)"

**3. 둘 다 애매한 경우 → 대상과 문제를 함께 물어보기**
예시:
- "청소 방법" → "어디를 어떻게 청소하고 싶으신가요? (예: 어떤 곳의 어떤 문제를 해결하고 싶으신지 알려주세요.)"
- "고장" → "무엇이 어떻게 고장났나요?"

친근하고 도움이 되는 톤으로 추가 질문을 생성해주세요.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "홈케어 전문가로서 사용자에게 구체적인 정보를 요청하는 친근한 추가 질문을 생성합니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=200
    )
    
    result = response.choices[0].message.content.strip()
    
    return result

def generate_natural_query(original_question, additional_info):
    """GPT를 사용해서 원래 질문과 추가 정보를 자연스럽게 합쳐서 완전한 질문 생성"""
    
    prompt = f"""
다음 원래 질문과 사용자가 추가로 제공한 정보를 하나의 자연스럽고 구체적인 질문으로 합쳐주세요.

원래 질문: "{original_question}"
추가 정보: "{additional_info}"

다음 예시를 참고하여 자연스럽고 명확한 질문으로 만들어주세요:

예시 1:
- 원래: "기름때 제거법"
- 추가: "욕실"
- 결과: "욕실 기름때 제거법"

예시 2:
- 원래: "어디에서"
- 추가: "곰팡이 제거"
- 결과: "곰팡이 제거"

예시 3:
- 원래: "화장실에서"
- 추가: "곰팡이"
- 결과: "화장실 곰팡이 제거"

예시 4:
- 원래: "첫 번째 질문"
- 추가: "이미 완전한 두 번째 질문입니다"
- 결과: "이미 완전한 두 번째 질문입니다"

중요:
- 불필요한 단어 없이 간결하게 작성
- 문법적으로 자연스러운 한국어로 작성
- 제거, 해결법, 제거법 등 동사는 유지
- 위치는 문제 앞에 배치 (예: "욕실 기름때 제거법")
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "사용자의 원래 질문과 추가 정보를 자연스럽고 명확한 하나의 질문으로 합치는 전문가입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=100
    )
    
    result = response.choices[0].message.content.strip()
    
    return result

def summarize_question(question: str) -> str:
    """GPT를 사용해서 질문을 간단한 제목으로 요약"""
    prompt = f"""
다음 질문을 세션 제목으로 사용할 수 있도록 간단하고 명확하게 요약해주세요.

요구사항:
- 최대 30자 이내
- 핵심 내용만 포함
- 불필요한 단어 제거
- 자연스러운 한국어

질문: "{question}"

요약:
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "질문을 간결하고 명확한 제목으로 요약하는 전문가입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=50
    )
    
    result = response.choices[0].message.content.strip()
    # 30자 제한
    if len(result) > 30:
        result = result[:30] + "..."
    
    return result

def needs_context(question, conversation_context=""):
    """GPT를 사용해서 문맥이 필요한지 판단"""
    
    context_prompt = ""
    if conversation_context:
        context_prompt = f"""
[이전 대화 내용]
{conversation_context}

"""
    
    prompt = f"""{context_prompt}다음 질문이 이전 대화 내용을 참고해야 하는지 판단해주세요.

📌 **문맥 필요 여부 판단 기준:**

**✅ 문맥이 필요한 질문 (이전 대화 참조 필수)**
다음과 같은 상대적/비교적 표현을 사용하는 경우:
1. **비교 표현**: "더 좋은", "가장 효과적인", "제일 좋아", "추천해줘"
2. **추가 정보 요청**: "주의사항은?", "비용은?", "시간은?", "단점은?", "장점은?"
3. **대안 요청**: "다른 방법도 있어?", "대체재는?", "대안은?"
4. **세부 정보**: "자세히 알려줘", "더 구체적으로", "추가 팁은?"
5. **강세 표현**: "너무 강해", "안되네", "효과 없어"
6. **지시대명사**: "이것", "저것", "그거", "그렇다면"

**❌ 문맥이 불필요한 질문 (독립적인 새 질문)**
1. **완전한 새 주제**: "변기 막힘 해결법", "후라이팬 기름때 제거"
2. **구체적 문제**: "화장실 곰팡이 제거", "수전 물때 제거", "기름때 제거법"
3. **명시적 정보**: 대상과 문제가 모두 명확히 제시된 경우
4. ⚠️ 주의: "OO 제거법", "OO 제거", "OO 해결법" 같은 표현은 독립적인 새 질문입니다!

**문맥 필요 예시:**
- "가장 효과적인 방법은 뭐야?" ✅
- "비용은 얼마나 들어?" ✅  
- "주의사항은 뭐야?" ✅
- "더 좋은 방법 있어?" ✅
- "이거 안되는데?" ✅ (이전에 언급된 방법에 대한 반응)
- "그럼 다른 건 뭐야?" ✅

**문맥 불필요 예시:**
- "변기 막힘 해결법" ❌ (완전히 새로운 주제)
- "후라이팬 기름때 제거" ❌ (완전히 새로운 주제)
- "종이벽지 기름때 해결법" ❌ (완전히 새로운 주제)

**현재 질문:** "{question}"

위 기준으로 판단하여 **"필요"** 또는 **"불필요"** 중 하나로만 답변해주세요.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "대화 문맥 분석 전문가입니다. 질문이 이전 대화 내용을 참고해야 하는지 판단하고, '필요' 또는 '불필요' 중 하나로만 답변합니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        max_tokens=50
    )
    
    result = response.choices[0].message.content.strip().lower()
    
    return result == "필요"

def generate_contextual_answer(question, conversation_context, search_context=""):
    """
    문맥을 고려한 답변 생성
    
    Args:
        question: 현재 사용자 질문 (예: "주의사항은?", "비용은?")
        conversation_context: 이전 대화 내용 (사용자 질문과 AI 답변)
        search_context: 검색된 문서들 (선택적, 있을 경우 추가 참고)
    
    Returns:
        이전 대화 내용을 참고한 답변
    """
    
    # 검색된 문서가 있으면 추가 참고 자료로 포함
    extra_info = ""
    if search_context:
        extra_info = f"\n\n[추가 참고 자료]\n{search_context}"
    
    prompt = f"""
당신은 홈케어 전문가입니다. 다음 이전 대화 내용을 바탕으로 사용자의 현재 질문에 답변해주세요.

[이전 대화 내용]
{conversation_context}

[현재 질문]
{question}
{extra_info}

위의 이전 대화 내용을 읽고, 그 내용과 연결하여 현재 질문에 답변해주세요.

답변 요구사항:
1. **이전에 이미 설명된 해결 방법을 참고하여 답변**합니다.
2. 이전 대화에서 언급되지 않은 새로운 주제를 꺼내지 않습니다.
3. 구체적이고 실용적인 답변을 제공합니다.
4. 안전을 최우선으로 고려합니다.

⚠️ 중요: 사용자 질문에 오타가 있다면, 답변에서 올바른 단어로 수정해서 사용하세요.
오타를 지적하지 말고 자연스럽게 올바른 단어로 답변하세요.

⚠️ 주의: 이전 대화 내용에 없는 정보는 추가하지 마세요. 모르면 "이전에 제공된 정보를 참고하여..." 같은 표현을 사용하세요.

⚠️ 형식: 답변 작성 시 #, ##, ### 같은 마크다운 헤딩을 사용하지 말고 **굵은 글씨**로 강조만 해주세요.
""".strip()

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "이전 대화 맥락을 정확히 이해하고 연결하여 답변하는 홈케어 전문가입니다."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=2048
    )
    
    result = response.choices[0].message.content.strip()
    
    return result