"""Data ingestion endpoints - file upload and Google Sheet URL."""
import httpx
import pandas as pd
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services import data_processor
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.models.machine import Machine
from app.models.schedule import Schedule, ScheduleItem
from app.models.insight import AIInsight
from app.models.quality import QualityMetric
from app.schemas.data import (
    DatasetUploadResponse, DatasetList, DatasetPreview,
    SheetURLRequest, SheetIngestResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data", tags=["data"])

EXTERNAL_WEBHOOK_URL = "https://api.agents.snsihub.ai/webhook/sheet"

# In-memory dataset tracking
datasets_db = []


async def _clear_analytics_tables(db: AsyncSession):
    """Wipe all analytics tables before new data ingestion."""
    await db.execute(delete(ProductionLog))
    await db.execute(delete(SensorData))
    await db.execute(delete(QualityMetric))
    await db.execute(delete(AIInsight))
    await db.execute(delete(ScheduleItem))
    await db.execute(delete(Schedule))
    await db.execute(delete(Machine))
    await db.commit()


async def _ingest_dataframe(df: pd.DataFrame, db: AsyncSession) -> tuple[int, str]:
    """Detect type, clean, and insert a DataFrame. Returns (inserted_count, dataset_type)."""
    df = data_processor.handle_missing_values(df)
    dataset_type = data_processor.detect_dataset_type(df)
    if dataset_type == "sensor_data":
        inserted = await data_processor.insert_sensor_data(df, db)
    else:
        inserted = await data_processor.insert_production_data(df, db)
    return inserted, dataset_type


@router.post("/ingest-sheet", response_model=SheetIngestResponse)
async def ingest_from_sheet(
    req: SheetURLRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ingest data from a Google Spreadsheet via external webhook."""
    logger.info(f"Ingesting sheet: {req.sheet_url}")
    
    # Forward the URL to the external webhook
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                EXTERNAL_WEBHOOK_URL,
                json={"sheet_url": req.sheet_url},
                headers={"Content-Type": "application/json"}
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="External webhook timed out. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to reach external backend: {str(e)}")
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"External webhook error: {response.text[:500]}"
        )
    
    # Parse the response
    try:
        raw_data = response.json()
    except Exception:
        raise HTTPException(status_code=502, detail="External backend returned invalid JSON")
    
    # Handle both array and object responses
    if isinstance(raw_data, list):
        rows = raw_data
    elif isinstance(raw_data, dict):
        # Try common keys
        for key in ["data", "rows", "records", "results", "values", "sheet_data"]:
            if key in raw_data and isinstance(raw_data[key], list):
                rows = raw_data[key]
                break
        else:
            # Treat the dict itself as a single-row dataset
            rows = [raw_data]
    else:
        raise HTTPException(status_code=502, detail="Unexpected response format from external backend")
    
    if not rows:
        raise HTTPException(status_code=400, detail="External backend returned empty data")
    
    # Convert to DataFrame
    df = pd.DataFrame(rows)
    
    # Clear existing data and ingest
    await _clear_analytics_tables(db)
    inserted, dataset_type = await _ingest_dataframe(df, db)
    
    # Track the dataset
    dataset_id = f"ds_{len(datasets_db) + 1}"
    datasets_db.append({
        "id": dataset_id,
        "filename": f"Google Sheet ({req.sheet_url[:50]}...)",
        "uploaded_at": datetime.utcnow().isoformat(),
        "type": dataset_type,
    })
    
    preview_data = df.head(5).to_dict(orient="records")
    
    logger.info(f"Ingested {inserted} rows as {dataset_type} from sheet")
    
    return SheetIngestResponse(
        message=f"Successfully ingested {inserted} rows from Google Sheet",
        inserted_rows=inserted,
        dataset_type=dataset_type,
        columns=list(df.columns),
        preview_data=preview_data,
    )


@router.post("/upload", response_model=DatasetUploadResponse)
async def upload_data(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a CSV/Excel file for data ingestion."""
    content = await file.read()
    await _clear_analytics_tables(db)
    
    try:
        fname = file.filename.lower() if file.filename else ""
        if fname.endswith(".csv"):
            df = data_processor.parse_csv(content)
        elif fname.endswith(".xlsx") or fname.endswith(".xls"):
            df = data_processor.parse_excel(content, file.filename)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use .csv or .xlsx")
        
        columns_mapping = data_processor.detect_columns(df)
        inserted, dataset_type = await _ingest_dataframe(df, db)
        
        dataset_id = f"ds_{len(datasets_db) + 1}"
        preview_data = df.head(5).to_dict(orient="records")
        
        preview = DatasetPreview(
            id=dataset_id,
            filename=file.filename,
            rows=len(df),
            columns=list(df.columns),
            preview_data=preview_data,
            column_mapping=columns_mapping
        )
        
        datasets_db.append({
            "id": dataset_id,
            "filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
            "type": dataset_type,
        })
        
        return DatasetUploadResponse(
            message="Upload successful",
            inserted_rows=inserted,
            dataset_type=dataset_type,
            preview=preview
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.get("/datasets", response_model=List[DatasetList])
async def list_datasets(current_user: User = Depends(get_current_user)):
    return [DatasetList(**ds) for ds in datasets_db]
