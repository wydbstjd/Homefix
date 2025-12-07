from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from efficientnet import (
    run_pipeline,
    load_model,
    problems,
    inv_location_map,
    valid_location_scope,
)
from nlp.main import return_solution, chat_with_ai, get_supplies_for_problem, _search_youtube_videos  # ← GPT 기반 해결책 생성 함수 및 채팅 함수
from PIL import Image
from pydantic import BaseModel
import io, base64, socket
import os
import re
import warnings
from googleapiclient.discovery import build

# TensorFlow 관련 경고 필터링 (sentence_transformers에서 간접 사용)
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # oneDNN 경고 비활성화
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # TensorFlow 로깅 레벨 조정 (0=모두, 1=INFO 제외, 2=WARNING 제외, 3=ERROR만)

# 모든 경고 필터링
warnings.filterwarnings('ignore')
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=RuntimeWarning)
warnings.filterwarnings('ignore', category=FutureWarning)
warnings.filterwarnings('ignore', module='tensorflow')
warnings.filterwarnings('ignore', module='keras')
warnings.filterwarnings('ignore', message='.*deprecated.*')
warnings.filterwarnings('ignore', message='.*OpenMP.*')
warnings.filterwarnings('ignore', message='.*oneDNN.*')
warnings.filterwarnings('ignore', message='.*threadpoolctl.*')

# TensorFlow 로깅 레벨 조정
import logging
logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('keras').setLevel(logging.ERROR)

app = FastAPI()

# CORS 허용 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 서비스에선 "*" 대신 앱 주소 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# EfficientNet 모델 로딩 (서버 시작 시 한 번만
model = load_model()

def get_local_ip():
    """현재 컴퓨터의 로컬 IP 주소를 가져옵니다."""
    try:
        # 외부 연결을 시도하여 로컬 IP 확인
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        # 실패 시 localhost 반환
        return "127.0.0.1"

class ImageBase64Request(BaseModel):
    image_base64: str

class ChatRequest(BaseModel):
    message: str

class SolveRequest(BaseModel):
    problem: str
    location: str


@app.get("/server-info/")
async def get_server_info():
    """서버 정보를 반환합니다 (IP 주소, 포트 등)."""
    return {
        "ip": get_local_ip(),
        "port": 8000,
        "base_url": f"http://{get_local_ip()}:8000"
    }

@app.post("/analyze/")
async def analyze(data: ImageBase64Request):
    try:
        # 이미지 읽기
        print("✅ 받은 base64 길이:", len(data.image_base64))
        image_bytes = base64.b64decode(data.image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"이미지 처리 실패: {str(e)}")

    # 문제 분류 임계값 설정 (로짓 값 기준)
    # 로짓 값 의미: 0 근처=불확실, 1~2=약간 확신, 2~3=적당한 확신, 5+=매우 높은 확신
    PROBLEM_CONFIDENCE_THRESHOLD = 6.0

    # 모델로 문제와 위치를 모두 예측
    predicted_problem, predicted_location, max_logit = run_pipeline(image, model=model)
    print(f"문제: {predicted_problem}, 위치: {predicted_location}, 최대 로짓 값: {max_logit:.3f}")

    # 임계값 미달 시 None 반환
    if max_logit < PROBLEM_CONFIDENCE_THRESHOLD:
        print(f"⚠️ 최대 로짓 값 {max_logit:.3f}가 임계값 {PROBLEM_CONFIDENCE_THRESHOLD} 미만")
        return {
            "problem": None,
            "location": None,
            "message": "사진을 다시 찍거나 채팅으로 물어보세요",
        }

    return {
        "problem": predicted_problem,
        "location": predicted_location,
    }

@app.post("/chat/")
async def chat(data: ChatRequest):
    try:
        # AI와 채팅 (구체성 정보 포함)
        result = chat_with_ai(data.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 처리 실패: {str(e)}")

@app.post("/summarize/")
async def summarize(data: ChatRequest):
    """질문을 세션 제목으로 요약"""
    try:
        from nlp.generator import summarize_question
        summary = summarize_question(data.message)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"요약 처리 실패: {str(e)}")

@app.post("/solve/")
async def solve(req: SolveRequest):
    try:
        solution, selected_problem, youtube_videos = return_solution(req.problem, req.location)
        return {
            "problem": selected_problem,
            "location": req.location,
            "solution": solution,
            "youtube_videos": youtube_videos if youtube_videos else [],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"해결책 생성 실패: {str(e)}")


# ------------------------ 제품 추천 (Google Custom Search API) ------------------------ #
class RecommendRequest(BaseModel):
    problem: str
    location: str
    # 선택적으로 프론트에서 supplies를 직접 전달할 수도 있음
    supplies_required: list[str] | None = None
    supplies_optional: list[str] | None = None

def _extract_price_from_text(text: str) -> int:
    """텍스트에서 가격 정보를 추출합니다."""
    # 가격 패턴 매칭 (원, 만원, 천원 등)
    price_patterns = [
        r'(\d{1,3}(?:,\d{3})*)\s*원',
        r'(\d{1,3}(?:,\d{3})*)\s*만원',
        r'(\d{1,3}(?:,\d{3})*)\s*천원',
        r'\$(\d{1,3}(?:,\d{3})*)',
        r'(\d{1,3}(?:,\d{3})*)\s*₩'
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text)
        if match:
            price_str = match.group(1).replace(',', '')
            try:
                price = int(price_str)
                if '만원' in text:
                    price *= 10000
                elif '천원' in text:
                    price *= 1000
                return price
            except ValueError:
                continue
    return None

def _extract_rating_from_text(text: str) -> float:
    """텍스트에서 별점 정보를 추출합니다."""
    # 별점 패턴 매칭
    rating_patterns = [
        r'(\d\.?\d?)\s*점',
        r'(\d\.?\d?)\s*★',
        r'(\d\.?\d?)\s*별',
        r'평점\s*(\d\.?\d?)',
        r'rating\s*(\d\.?\d?)',
        r'(\d\.?\d?)\s*/\s*5'
    ]
    
    for pattern in rating_patterns:
        match = re.search(pattern, text.lower())
        if match:
            try:
                rating = float(match.group(1))
                if rating <= 5:
                    return rating
            except ValueError:
                continue
    return None

def _google_search_products(keyword: str, limit: int = 10) -> list:
    """Google Custom Search API를 사용해서 제품을 검색합니다."""
    api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
    search_engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
    
    if not api_key or not search_engine_id:
        print("Google Search API 키가 설정되지 않았습니다.")
        return []

    try:
        service = build("customsearch", "v1", developerKey=api_key)
        
        # 쇼핑몰 사이트에서 검색하도록 쿼리 최적화
        search_query = f"{keyword} 구매 가격 리뷰"
        
        result = service.cse().list(
            q=search_query,
            cx=search_engine_id,
            num=limit,
            safe='active'
        ).execute()

        products = []
        items = result.get('items', [])
        
        for item in items:
            title = item.get('title', '')
            snippet = item.get('snippet', '')
            link = item.get('link', '')
            
            # 이미지 URL 추출
            image_url = None
            if 'pagemap' in item and 'cse_image' in item['pagemap']:
                image_url = item['pagemap']['cse_image'][0].get('src')
            elif 'pagemap' in item and 'metatags' in item['pagemap']:
                for meta in item['pagemap']['metatags']:
                    if 'og:image' in meta:
                        image_url = meta['og:image']
                        break
            
            # 가격 추출
            price = _extract_price_from_text(title + ' ' + snippet)
            
            # 별점 추출
            rating = _extract_rating_from_text(title + ' ' + snippet)
            
            # 쇼핑몰 사이트인지 확인 (네이버쇼핑, 쿠팡, 11번가, G마켓 등)
            is_shopping_site = any(site in link.lower() for site in [
                'shopping.naver.com', 'coupang.com', '11st.co.kr', 
                'gmarket.co.kr', 'auction.co.kr', 'interpark.com',
                'lotte.com', 'homeplus.co.kr', 'emart.com'
            ])
            
            products.append({
                "title": title,
                "snippet": snippet,
                "price": price,
                "rating": rating,
                "link": link,
                "imageUrl": image_url,
                "is_shopping_site": is_shopping_site,
                "ad": False
            })
        
        return products
        
    except Exception as e:
        print(f"Google Search API 오류: {e}")
        return []

def _filter_and_rank_products(products: list, limit: int = 2) -> list:
    """제품을 필터링하고 순위를 매깁니다."""
    # 쇼핑몰 사이트 우선, 가격 정보 있는 것 우선, 별점 높은 것 우선
    def sort_key(product):
        score = 0
        
        # 쇼핑몰 사이트 가산점
        if product.get('is_shopping_site', False):
            score += 100
            
        # 가격 정보 있으면 가산점
        if product.get('price') is not None:
            score += 50
            
        # 별점 가산점 (0-50점)
        if product.get('rating') is not None:
            score += product['rating'] * 10
            
        return score
    
    # 정렬 후 상위 제품만 반환
    sorted_products = sorted(products, key=sort_key, reverse=True)
    
    # 결과 정리
    results = []
    for product in sorted_products[:limit]:
        results.append({
            "title": product['title'][:100],  # 제목 길이 제한
            "price": product.get('price'),
            "link": product['link'],
            "imageUrl": product.get('imageUrl'),
            "rating": product.get('rating'),
            "ad": False
        })
    
    return results

def _keyword_groups(problem: str, location: str, supplies_required: list[str] | None = None, supplies_optional: list[str] | None = None) -> list:
    """homefix.md에서 준비물(필수/선택)을 파싱하여 키워드 그룹 생성.

    그룹 형식:
    - group: "준비물(필수)", required: True, keywords: [...]
    - group: "준비물(선택)", required: False, keywords: [...]
    """
    # 1) 요청에 supplies가 직접 담겨온 경우 우선 사용
    req_items = supplies_required or []
    opt_items = supplies_optional or []

    # 2) 비어 있으면 homefix.md에서 파싱
    if not req_items and not opt_items and problem:
        req_items, opt_items = get_supplies_for_problem(problem)

    # 3) 그룹 생성
    groups: list[dict] = []
    if req_items:
        groups.append({"group": "준비물(필수)", "required": True, "keywords": req_items})
    if opt_items:
        groups.append({"group": "준비물(선택)", "required": False, "keywords": opt_items})
    
    # 준비물이 전혀 없는 경우 기본 그룹 생성
    if not groups:
        groups.append({"group": "기본", "required": True, "keywords": [problem] if problem else []})
    
    return groups

def _fallback_results(groups: list) -> list:
    """API 실패 시 기본 검색 링크 제공"""
    results = []
    for g in groups:
        items = []
        for i, kw in enumerate(g["keywords"][:2]):  # 최대 2개
            items.append({
                "title": f"{kw} - 네이버쇼핑에서 검색",
                "price": None,
                "link": f"https://search.shopping.naver.com/search/all?query={kw}",
                "imageUrl": None,
                "rating": None,
                "ad": False
            })
        results.append({
            "group": g["group"],
            "required": g["required"],
            "items": items
        })
    return results

@app.post("/recommend/")
async def recommend(req: RecommendRequest):
    """제품 추천 API - Google Custom Search 사용"""
    groups = _keyword_groups(req.problem, req.location, req.supplies_required, req.supplies_optional)
    has_keys = bool(os.environ.get("GOOGLE_SEARCH_API_KEY") and os.environ.get("GOOGLE_SEARCH_ENGINE_ID"))

    if not has_keys:
        print("Google Search API 키가 없어서 기본 검색 링크를 제공합니다.")
        return {"groups": _fallback_results(groups)}

    grouped = []
    for g in groups:
        # 준비물 기반 그룹은 항상 정확한 키워드 검색 링크로 제공 (네이버쇼핑)
        if g.get("group") in ["준비물(필수)", "준비물(선택)"]:
            items = _fallback_results([g])[0]["items"]
            grouped.append({
                "group": g["group"],
                "required": g["required"],
                "items": items
            })
            continue

        all_products = []
        # 각 키워드로 제품 검색 (Google API)
        for kw in g["keywords"]:
            products = _google_search_products(kw, limit=5)
            all_products.extend(products)

        # 제품 필터링 및 순위 매기기
        if all_products:
            best_products = _filter_and_rank_products(all_products, limit=2)
        else:
            # 검색 실패 시 기본 링크 제공
            best_products = _fallback_results([g])[0]["items"]

        grouped.append({
            "group": g["group"],
            "required": g["required"],
            "items": best_products
        })

    return {"groups": grouped}