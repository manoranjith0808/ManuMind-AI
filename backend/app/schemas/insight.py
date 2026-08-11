from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class InsightBase(BaseModel):
    category: str
    priority: str
    title: str
    description: str
    action_items: List[str]
    data_evidence: Dict[str, Any]

class InsightResponse(InsightBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
