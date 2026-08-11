from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DatasetPreview(BaseModel):
    id: str
    filename: str
    rows: int
    columns: List[str]
    preview_data: List[Dict[str, Any]]
    column_mapping: Dict[str, str]

class DatasetUploadResponse(BaseModel):
    message: str
    inserted_rows: int
    dataset_type: str
    preview: DatasetPreview

class DatasetList(BaseModel):
    id: str
    filename: str
    uploaded_at: str
    type: str

class SheetURLRequest(BaseModel):
    sheet_url: str

class SheetIngestResponse(BaseModel):
    message: str
    inserted_rows: int
    dataset_type: str
    columns: List[str]
    preview_data: List[Dict[str, Any]]
