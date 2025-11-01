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
import timm
from efficientnet_pytorch import EfficientNet

from torchvision import models
# ------------------------- 모델 정의 ------------------------- #
# 1. EfficientNetV2Model 클래스 정의
class EfficientNetV2Model(nn.Module):
    def __init__(self, num_labels):
        super().__init__()
        self.backbone = models.efficientnet_v2_m(weights=models.EfficientNet_V2_M_Weights.IMAGENET1K_V1)
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


# ------------------------- 설정 ------------------------- #
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

location_map = {
    '가구': 0, '가스레인지': 1, '공구류': 2, '난간': 3, '냄비/후라이팬': 4,
    '문틀': 5, '배관류': 6, '부품': 7, '세탁기': 8, '스테인리스류': 9,
    '에어컨': 10, '유리': 11, '인덕션': 12, '종이벽지': 13, '주방가전': 14,
    '타일': 15, '페인트벽': 16, '후드': 17
}
inv_location_map = {v: k for k, v in location_map.items()}
problems = ['기름때', '곰팡이', '녹', '물때', '깨짐', '찢어짐', '스크래치']

valid_location_scope = {
    0: [1, 4, 9, 12, 13, 14, 15, 16, 17],   # grease
    1: [5, 8, 10, 13, 15, 16],              # mold
    2: [0, 1, 2, 3, 5, 6, 7, 9],            # rust
    3: [9, 11],                             # water_stain
    4: [11, 15],                            # crack
    5: [13, 16],                            # tear
    6: [0, 11, 15],                         # scratch
}

transform = transforms.Compose([
    transforms.Resize(384),
    transforms.CenterCrop(384),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


# ------------------------- 모델 로딩 ------------------------- #
def load_model(weight_path='best_model.pt'):
    model = EfficientNetV2Model(num_labels=7)
    model.load_state_dict(torch.load(weight_path, map_location=device))
    model.to(device)
    model.eval()
    return model


# ------------------------- 예측 함수 ------------------------- #
def predict_image(model, image_path_or_pil):
    if isinstance(image_path_or_pil, str):
        image = Image.open(image_path_or_pil).convert('RGB')
    else:
        image = image_path_or_pil.convert('RGB')

    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        label_out = model(image)
        pred_label_idx = torch.argmax(label_out, dim=1).item()

    # 위치는 더 이상 모델이 예측하지 않음
    return pred_label_idx, None


# ------------------------- 파이프라인 함수 ------------------------- #
def run_pipeline(image_path_or_pil, model=None):
    if model is None:
        model = load_model()

    pred_label, pred_loc = predict_image(model, image_path_or_pil)

    pred_label_name = problems[pred_label]
    pred_loc_name = inv_location_map[pred_loc] if pred_loc is not None else None

    return pred_label_name, pred_loc_name

