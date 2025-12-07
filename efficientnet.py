import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from torchvision.transforms import InterpolationMode
from PIL import Image
import pandas as pd
import os
import warnings
import logging
import timm
from efficientnet_pytorch import EfficientNet

from torchvision import models

# 경고 필터링
warnings.filterwarnings('ignore')
warnings.filterwarnings('ignore', category=RuntimeWarning)
warnings.filterwarnings('ignore', message='.*OpenMP.*')
warnings.filterwarnings('ignore', message='.*threadpoolctl.*')

# ------------------------- 모델 정의 ------------------------- #
# 1. 문제 예측 모델 (EfficientNetV2-M 기반)
class EfficientNetV2Problem(nn.Module):
    def __init__(self, num_labels):
        super().__init__()
        self.backbone = models.efficientnet_v2_m(weights='IMAGENET1K_V1')
        feature_dim = self.backbone.classifier[-1].in_features
        self.backbone.classifier = nn.Identity()
        
        self.label_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_labels)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        label_out = self.label_head(features)
        return label_out


# 2. 위치 예측 모델 (EfficientNetV2-M 기반)
class EfficientNetV2_Location(nn.Module):
    def __init__(self, num_classes=11):  # 위치 클래스 개수에 맞게 수정
        super().__init__()
        self.backbone = models.efficientnet_v2_m(weights='IMAGENET1K_V1')
        in_features = self.backbone.classifier[1].in_features
        self.backbone.classifier = nn.Linear(in_features, num_classes)
    
    def forward(self, x):
        return self.backbone(x)


# ------------------------- 설정 ------------------------- #
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 문제 유형 정의
problems = ['기름때', '곰팡이', '녹', '물때', '깨짐', '찢어짐', '스크래치']
problem_to_idx = {p: i for i, p in enumerate(problems)}

# 각 문제 유형별 위치 레이블 정의
location_labels = {
    '기름때': ['가스레인지', '냄비/후라이팬', '싱크대', '인덕션', '종이벽지', '타일', '페인트벽', '후드', '에어프라이어', '오븐', '전자레인지'],
    '곰팡이': ['세탁기', '에어컨', '종이벽지', '문틀', '타일', '페인트벽'],
    '물때': ['수전', '싱크대', '욕실용품', '유리/거울'],
    '녹': ['가구', '가스레인지', '공구류', '난간', '배관류', '문틀', '경첩', '문손잡이', '나사/못', '스테인리스류'],
    '깨짐': ['유리/거울', '타일'],
    '찢어짐': ['종이벽지', '페인트벽'],
    '스크래치': ['가구', '유리/거울', '타일']
}

# 문제 유형별 위치 모델 파일명 매핑
problem_to_model_file = {
    '기름때': 'models/best_location_model_grease.pt',
    '곰팡이': 'models/best_location_model_mold.pt',
    '물때': 'models/best_location_model_water_stain.pt',
    '녹': 'models/best_location_model_rust.pt',
    '깨짐': 'models/best_location_model_crack.pt',
    '찢어짐': 'models/best_location_model_tear.pt',
    '스크래치': 'models/best_location_model_scratch.pt'
}

# 하위 호환성을 위한 전역 변수 (app.py에서 import하는 변수들)
# 더 이상 사용하지 않지만 기존 코드와의 호환성 유지
location_map = {}
inv_location_map = {}
valid_location_scope = {}

# Export할 변수들
__all__ = [
    'load_model',
    'load_models',
    'run_pipeline',
    'predict_image',
    'problems',
    'location_labels',
    'problem_to_model_file',
    # 하위 호환성
    'inv_location_map',
    'valid_location_scope',
]

# 추론용 transform (랜덤 증강 제거 - 일관된 결과를 위해)
transform = transforms.Compose([
    transforms.Resize((384, 384), interpolation=InterpolationMode.BILINEAR),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])


# ------------------------- 모델 로딩 ------------------------- #
def load_models():
    """
    문제 예측 모델과 7개의 위치 예측 모델을 로딩합니다.
    
    Returns:
        dict: {
            'problem_model': 문제 예측 모델,
            'location_models': {문제명: 위치 예측 모델} 딕셔너리
        }
    """
    # 1. 문제 예측 모델 로딩 (EfficientNetV2-M)
    problem_model = EfficientNetV2Problem(num_labels=7)
    problem_model.load_state_dict(
        torch.load('models/best_efficientnetv2_model_3.pt', map_location=device)
    )
    problem_model.to(device)
    problem_model.eval()
    
    # 2. 각 문제 유형별 위치 예측 모델 로딩 (EfficientNetV2-M)
    location_models = {}
    for problem_name, model_path in problem_to_model_file.items():
        num_locations = len(location_labels[problem_name])
        loc_model = EfficientNetV2_Location(num_classes=num_locations)
        loc_model.load_state_dict(
            torch.load(model_path, map_location=device)
        )
        loc_model.to(device)
        loc_model.eval()
        location_models[problem_name] = loc_model
    
    return {
        'problem_model': problem_model,
        'location_models': location_models
    }


def load_model():
    """하위 호환성을 위한 함수"""
    return load_models()


# ------------------------- 예측 함수 ------------------------- #
def predict_image(models_dict, image_path_or_pil):
    """
    2단계 예측: 먼저 문제를 예측하고, 해당 문제의 위치 모델로 위치를 예측
    
    Args:
        models_dict: load_models()로 로드한 모델 딕셔너리
        image_path_or_pil: 이미지 파일 경로 또는 PIL Image 객체
        
    Returns:
        tuple: (문제 인덱스, 위치 인덱스 (해당 문제 내에서의 인덱스), 최대 로짓 값)
    """
    # 이미지 로딩 및 전처리
    if isinstance(image_path_or_pil, str):
        image = Image.open(image_path_or_pil).convert('RGB')
    else:
        image = image_path_or_pil.convert('RGB')
    
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    # 1단계: 문제 예측
    with torch.no_grad():
        problem_output = models_dict['problem_model'](image_tensor)
        pred_problem_idx = torch.argmax(problem_output, dim=1).item()
        # argmax한 로짓 값 추출 (softmax 없이)
        max_logit = problem_output[0][pred_problem_idx].item()
    
    # 예측된 문제명
    pred_problem_name = problems[pred_problem_idx]
    
    # 2단계: 해당 문제의 위치 모델로 위치 예측
    location_model = models_dict['location_models'][pred_problem_name]
    with torch.no_grad():
        location_output = location_model(image_tensor)
        pred_location_idx = torch.argmax(location_output, dim=1).item()
    
    return pred_problem_idx, pred_location_idx, max_logit


# ------------------------- 파이프라인 함수 ------------------------- #
def run_pipeline(image_path_or_pil, model=None):
    """
    이미지에서 문제와 위치를 예측하는 전체 파이프라인
    
    Args:
        image_path_or_pil: 이미지 파일 경로 또는 PIL Image 객체
        model: 모델 딕셔너리 (None이면 자동 로딩)
        
    Returns:
        tuple: (문제명, 위치명, 최대 로짓 값)
    """
    # 모델 로딩
    if model is None:
        model = load_models()
    
    # 예측 수행
    pred_problem_idx, pred_location_idx, max_logit = predict_image(model, image_path_or_pil)
    
    # 인덱스를 문자열로 변환
    pred_problem_name = problems[pred_problem_idx]
    pred_location_name = location_labels[pred_problem_name][pred_location_idx]
    
    return pred_problem_name, pred_location_name, max_logit

