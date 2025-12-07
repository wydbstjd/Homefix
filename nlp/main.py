from .search import load_search_index, search_documents
from .generator import generate_answer, generate_contextual_answer
from .conversation import process_user_message
import re
import urllib.parse
import os
from googleapiclient.discovery import build

# 서버 시작 시 1회만 로딩
retriever, index, docs, problem_texts = load_search_index()

# 이미지 분석 결과로 솔루션 반환
def return_solution(label: str, loc: str):
    """이미지 분석 결과로 솔루션과 선택된 문제 제목(전체)을 반환"""
    # 정확한 매칭을 위해 "위치 문제" 형식으로 검색
    question = f"{loc} {label}"

    # 문서 검색 (정확한 위치+문제 조합으로 검색)
    filtered_docs = search_documents(question, retriever, index, docs)

    # 검색된 문서들의 제목 출력 (디버그용)
    if filtered_docs:
        print("\n" + "="*60)
        print("📚 해결책 생성에 사용된 문서:")
        for i, doc in enumerate(filtered_docs, 1):
            title_match = re.search(r"## 문제[:：](.+)", doc)
            if title_match:
                print(f"  {i}. {title_match.group(1).strip()}")
        print("="*60 + "\n")

    # 모든 문서에서 해결책 섹션 추출
    solution_text = extract_all_solutions(filtered_docs) if filtered_docs else ""

    # GPT로 해결책 생성 (더 자연스러운 질문 형식으로)
    natural_question = f"{loc}에서 {label} 제거하는 법 알려줘."
    answer = generate_answer(natural_question, solution_text)

    # 최상위 매칭 문서의 문제 제목 추출
    selected_problem = f"{loc} {label}"
    if filtered_docs:
        title_match = re.search(r"## 문제[:：](.+)", filtered_docs[0])
        if title_match:
            selected_problem = title_match.group(1).strip()

    # 유튜브 영상 검색
    youtube_videos = []
    if filtered_docs:
        # 문제 키워드로 유튜브 검색
        problem_keyword = selected_problem
        youtube_videos = _search_youtube_videos(problem_keyword, limit=3)

    return answer, selected_problem, youtube_videos


def extract_solution_section(doc_text: str) -> str:
    """문서에서 ## 문제부터 **준비물(필수)** 이전까지 추출"""
    # ## 문제부터 추출 (해결책, 팁 포함)
    pattern = r"(## 문제[:：][^\n]+[\s\S]*?)(?=\*\*준비물\(필수\)\*\*|$)"
    match = re.search(pattern, doc_text)
    if match:
        return match.group(1).strip()
    return ""

def extract_all_solutions(filtered_docs: list, max_length: int = 4000) -> str:
    """모든 검색된 문서에서 해결책을 추출"""
    solutions = []
    total_length = 0
    
    for doc in filtered_docs:
        solution = extract_solution_section(doc)
        if solution:
            # 길이 제한 체크
            solution_length = len(solution)
            if total_length + solution_length > max_length:
                break
            solutions.append(solution)
            total_length += solution_length
    
    return "\n\n---\n\n".join(solutions)

def get_supplies_for_problem(problem_title: str):
    """problem_title로 섹션 찾아서 준비물 파싱"""
    try:
        idx = problem_texts.index(problem_title)
        return parse_supplies_from_document(docs[idx])
    except ValueError:
        return [], []

def parse_supplies_from_document(doc_text: str) -> tuple[list[str], list[str]]:
    """문서에서 준비물(필수/선택) 파싱"""
    required_items = []
    optional_items = []
    
    # **준비물(필수)** 다음 두 줄만 추출
    req_pattern = r"\*\*준비물\(필수\)\*\*\n([^\n]+)\n?([^\n]*)?"
    req_match = re.search(req_pattern, doc_text)
    if req_match:
        # 두 줄을 합치되, 빈 줄은 제외
        req_lines = [req_match.group(1).strip(), req_match.group(2).strip()] if req_match.group(2) else [req_match.group(1).strip()]
        req_content = '\n'.join([line for line in req_lines if line])
        # "(없음)", "nan", 빈 문자열 필터링
        if req_content and "(없음)" not in req_content.lower() and req_content.lower() != "nan":
            required_items = [item.strip() for item in req_content.split(',') if item.strip() and item.strip().lower() != "nan"]
    
    # **준비물(선택)** 다음 두 줄만 추출
    opt_pattern = r"\*\*준비물\(선택\)\*\*\n([^\n]+)\n?([^\n]*)?"
    opt_match = re.search(opt_pattern, doc_text)
    if opt_match:
        # 두 줄을 합치되, 빈 줄은 제외
        opt_lines = [opt_match.group(1).strip(), opt_match.group(2).strip()] if opt_match.group(2) else [opt_match.group(1).strip()]
        opt_content = '\n'.join([line for line in opt_lines if line])
        # "(없음)", "nan", 빈 문자열 필터링
        if opt_content and "(없음)" not in opt_content.lower() and opt_content.lower() != "nan":
            optional_items = [item.strip() for item in opt_content.split(',') if item.strip() and item.strip().lower() != "nan"]
    
    return required_items, optional_items

def _search_youtube_videos(keyword: str, limit: int = 3) -> list:
    """YouTube Data API v3를 사용해서 유튜브 영상을 검색합니다."""
    api_key = os.environ.get("YOUTUBE_API_KEY")
    
    if not api_key:
        print("⚠️ YOUTUBE_API_KEY가 설정되지 않았습니다.")
        return []
    
    try:
        print(f"🔍 유튜브 검색 키워드: {keyword}")
        service = build("youtube", "v3", developerKey=api_key)
        
        result = service.search().list(
            part="snippet",
            q=keyword,
            type="video",
            maxResults=limit,
            order="relevance"
        ).execute()
        
        videos = []
        items = result.get('items', [])
        print(f"📋 검색 결과 아이템 수: {len(items)}")
        
        for item in items:
            snippet = item.get('snippet', {})
            id_info = item.get('id', {})
            
            title = snippet.get('title', '')
            description = snippet.get('description', '')
            video_id = id_info.get('videoId', '')
            thumbnails = snippet.get('thumbnails', {})
            
            # 썸네일 URL 추출 (최고 해상도 우선)
            thumbnail_url = None
            if thumbnails:
                if 'maxres' in thumbnails:
                    thumbnail_url = thumbnails['maxres']['url']
                elif 'high' in thumbnails:
                    thumbnail_url = thumbnails['high']['url']
                elif 'medium' in thumbnails:
                    thumbnail_url = thumbnails['medium']['url']
                elif 'default' in thumbnails:
                    thumbnail_url = thumbnails['default']['url']
            
            link = f"https://www.youtube.com/watch?v={video_id}"
            
            if video_id:
                videos.append({
                    "title": title,
                    "description": description,
                    "link": link,
                    "thumbnailUrl": thumbnail_url,
                    "videoId": video_id
                })
                print(f"  ✅ 유튜브 영상 추가: {title[:50]}")
        
        # 최대 limit 개수만 반환 (안전장치)
        return videos[:limit]
        
    except Exception as e:
        print(f"❌ YouTube Data API 오류:")
        print(f"   {str(e)}")
        import traceback
        traceback.print_exc()
        return []

# 사용자 텍스트에 대한 솔루션 반환
def chat_with_ai(user_message: str):
    """
    사용자 메시지에 대한 스마트한 채팅 응답을 생성합니다.
    구체적이지 않은 질문의 경우 추가 질문을 통해 더 정확한 답변을 제공합니다.
    문맥이 필요한 질문의 경우 이전 대화를 고려한 답변을 생성합니다.
    
    Returns:
        dict: {"response": 답변, "is_specific": 구체성 여부, "supplies": 준비물 정보}
    """
    
    # 먼저 문맥 필요 여부 확인
    from .conversation import conversation_manager
    from .generator import needs_context
    
    conversation_context = conversation_manager.get_conversation_context()
    requires_context = needs_context(user_message, conversation_context)
    
    # 문맥이 필요하지 않을 때만 관련 질문 여부 확인
    if not requires_context:
        from .generator import is_relevant_question
        if not is_relevant_question(user_message):
            return {
                "response": "죄송합니다. 이 서비스는 집안 오염 및 문제 해결에 관련된 질문만 답변할 수 있습니다. 집안 오염 관련 문제를 질문해주세요.",
                "is_specific": False
            }
    
    # 대화 처리
    response_message, is_final_answer, requires_context = process_user_message(user_message)
    
    if not is_final_answer:
        # 추가 질문이 필요한 경우 (애매한 질문)
        return {"response": response_message, "is_specific": False}
    
    if requires_context:
        # 문맥이 필요한 질문인 경우
        from .conversation import conversation_manager
        
        # 이전 대화 내용 가져오기
        conversation_context = conversation_manager.get_conversation_context()
        
        # 이전 대화에서 문제 키워드 추출 (첫 번째 사용자 질문 사용)
        search_query = response_message  # 기본값은 현재 질문
        if conversation_manager.conversation_history:
            # 첫 번째 사용자 질문이 가장 구체적인 문제일 가능성이 높음
            first_user_question = conversation_manager.conversation_history[0]["user"]
            # 이전 문제와 현재 질문을 결합해서 검색
            search_query = f"{first_user_question} {response_message}"
        
        # 문서 검색 (이전 문제 + 현재 질문으로 검색)
        filtered_docs = search_documents(search_query, retriever, index, docs)
        
        # 검색된 문서들의 제목 출력 (디버그용)
        if filtered_docs:
            print("\n" + "="*60)
            print("💬 [채팅] 사용된 문서:")
            for i, doc in enumerate(filtered_docs, 1):
                title_match = re.search(r"## 문제[:：](.+)", doc)
                if title_match:
                    print(f"  {i}. {title_match.group(1).strip()}")
            print("="*60 + "\n")
        
        search_context = "\n\n---\n\n".join(filtered_docs) if filtered_docs else ""
        
        # 문맥 기반 답변 생성
        answer = generate_contextual_answer(response_message, conversation_context, search_context)
        
        # 대화 기록에 최종 답변 추가 (추가하면 오류 발생)
        # conversation_manager.add_to_history(response_message, answer)
        
        return {"response": answer, "is_specific": True}
    
    # 일반적인 최종 답변을 생성하는 경우
    filtered_docs = search_documents(response_message, retriever, index, docs)
    
    # 검색된 문서들의 제목 출력 (디버그용)
    if filtered_docs:
        print("\n" + "="*60)
        print("💬 [채팅] 사용된 문서:")
        for i, doc in enumerate(filtered_docs, 1):
            title_match = re.search(r"## 문제[:：](.+)", doc)
            if title_match:
                print(f"  {i}. {title_match.group(1).strip()}")
        print("="*60 + "\n")
    
    # 모든 문서에서 해결책 섹션 추출
    solution_text = extract_all_solutions(filtered_docs) if filtered_docs else ""
    
    # 모든 문서에서 준비물 정보 추출
    all_required_items = []
    all_optional_items = []
    if filtered_docs:
        for doc in filtered_docs:
            required_items, optional_items = parse_supplies_from_document(doc)
            all_required_items.extend(required_items)
            all_optional_items.extend(optional_items)
    
    # 준비물 검색 링크 생성 (중복 제거)
    supply_links = []
    seen_items = set()
    
    for item in all_required_items:
        if item not in seen_items:
            supply_links.append({
                "keyword": item,
                "type": "필수",
                "link": f"https://search.shopping.naver.com/search/all?query={urllib.parse.quote(item)}"
            })
            seen_items.add(item)
    
    for item in all_optional_items:
        if item not in seen_items:
            supply_links.append({
                "keyword": item,
                "type": "선택",
                "link": f"https://search.shopping.naver.com/search/all?query={urllib.parse.quote(item)}"
            })
            seen_items.add(item)

    answer = generate_answer(response_message, solution_text)
    
    # 유튜브 영상 검색 (구체적인 질문일 때만)
    youtube_videos = []
    if filtered_docs and solution_text:
        # 문제 키워드로 유튜브 검색
        # 첫 번째 문서의 문제 제목을 키워드로 사용
        problem_keyword = response_message
        if filtered_docs:
            title_match = re.search(r"## 문제[:：](.+)", filtered_docs[0])
            if title_match:
                problem_keyword = title_match.group(1).strip()
        
        # 유튜브 검색 실행
        youtube_videos = _search_youtube_videos(problem_keyword, limit=3)
    
    # 대화 기록에 추가 (추가하면 오류 발생)
    from .conversation import conversation_manager
    conversation_manager.add_to_history(response_message, answer)
    
    return {
        "response": answer,
        "is_specific": True,
        "supplies": supply_links,
        "solution": solution_text,
        "youtube_videos": youtube_videos
    }
