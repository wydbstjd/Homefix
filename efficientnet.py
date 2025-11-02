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
    def __init__(self, num_labels, num_locations, model_name='efficientnetv2_m'):
        super().__init__()
        self.backbone = models.efficientnet_v2_m(pretrained=True)
        feature_dim = self.backbone.classifier[-1].in_features

        # Head: 간단한 MLP + Dropout (특징 벡터를 바로 사용)
        self.label_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_labels)
        )

        self.loc_head = nn.Sequential(
            nn.Linear(feature_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_locations)
        )

    def forward(self, x):

        original_classifier = self.backbone.classifier
        self.backbone.classifier = nn.Identity()

        features = self.backbone(x)

        self.backbone.classifier = original_classifier

        label_out = self.label_head(features)
        loc_out = self.loc_head(features)
        return label_out, loc_out


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
    transforms.Resize((384, 384), interpolation=InterpolationMode.BILINEAR),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
])


# ------------------------- 모델 로딩 ------------------------- #
def load_model(weight_path='best_model.pt'):
    model = EfficientNetV2Model(num_labels=7, num_locations=len(location_map))
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
        label_out, loc_out = model(image)

        pred_label_idx = torch.argmax(label_out, dim=1).item()

        # 유효 위치 마스킹
        valid_indices = valid_location_scope[pred_label_idx]
        masked_loc_out = torch.full_like(loc_out, -1e9)
        masked_loc_out[:, valid_indices] = loc_out[:, valid_indices]
        pred_loc_idx = torch.argmax(masked_loc_out, dim=1).item()

    return pred_label_idx, pred_loc_idx


# ------------------------- 파이프라인 함수 ------------------------- #
def run_pipeline(image_path_or_pil, model=None):
    if model is None:
        model = load_model()

    pred_label, pred_loc = predict_image(model, image_path_or_pil)

    pred_label_name = problems[pred_label]
    pred_loc_name = inv_location_map[pred_loc]

    return pred_label_name, pred_loc_name

