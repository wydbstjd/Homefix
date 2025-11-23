import re
import faiss
import numpy as np
from sklearn.preprocessing import normalize
from sentence_transformers import SentenceTransformer

def extract_problem_only(docs):
    """문서에서 "## 문제:" 항목만 추출"""
    problems = []
    for doc in docs:
        match = re.search(r"## 문제[:：](.+)", doc)
        problems.append(match.group(1).strip() if match else "")
    return problems

def load_search_index(md_path="homefix.md"):
    """FAISS 검색 인덱스 로딩"""
    with open(md_path, "r", encoding="utf-8") as f:
        markdown_text = f.read()

    sections = markdown_text.split("\n---\n")
    docs = [section.strip() for section in sections if section.strip()]

    retriever = SentenceTransformer("jhgan/ko-sroberta-multitask")

    problem_texts = extract_problem_only(docs)
    problem_embeddings = retriever.encode(problem_texts, convert_to_tensor=False)
    problem_embeddings = np.array(problem_embeddings).astype("float32")
    problem_embeddings = normalize(problem_embeddings, norm='l2')

    dim = problem_embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(problem_embeddings)

    return retriever, index, docs, problem_texts

def search_documents(query: str, retriever, index, docs, k=2):
    """문서 검색 수행"""
    # 질문 임베딩
    query_embedding = retriever.encode([query], convert_to_tensor=False)
    query_embedding = np.array(query_embedding).astype("float32")
    query_embedding = normalize(query_embedding, norm='l2')

    # FAISS 검색
    distances, labels = index.search(query_embedding, k=k)
    best_dist = distances[0][0]
    filtered_docs = [
        docs[i] for i, dist in zip(labels[0], distances[0]) if dist <= best_dist + 0.2
    ]

    return filtered_docs
