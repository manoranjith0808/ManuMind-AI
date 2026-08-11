"""Data processor service for parsing and ingesting uploaded datasets.

Handles Excel/CSV parsing, intelligent column mapping, missing value
imputation, and insertion into the appropriate database tables.
"""
import pandas as pd
import io
import re
import logging
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.models.machine import Machine

logger = logging.getLogger(__name__)

# --- Column mapping aliases ---
# Each DB field maps to a list of possible column name patterns (case-insensitive)
PRODUCTION_COLUMN_ALIASES = {
    "machine_id": ["machine_id", "machine", "machine_no", "machine_code", "machine_name", "machineid", "mc_id", "equipment_id", "equipment"],
    "product_type": ["product_type", "product", "product_name", "product_code", "item", "item_type", "part", "part_name", "part_no", "sku"],
    "quantity_produced": ["quantity_produced", "produced", "qty_produced", "production", "output", "quantity", "qty", "actual_qty", "actual_production", "units_produced", "count", "produced_qty", "good_qty", "good_count"],
    "target_quantity": ["target_quantity", "target", "target_qty", "planned", "planned_qty", "plan", "order_qty", "required_qty", "demand"],
    "start_time": ["start_time", "start", "start_date", "date", "datetime", "timestamp", "time", "production_date", "log_date", "created_at", "created"],
    "end_time": ["end_time", "end", "end_date", "finish_time", "completion_time", "completed_at"],
    "shift": ["shift", "shift_name", "shift_type", "shift_no", "work_shift"],
    "operator_name": ["operator_name", "operator", "worker", "employee", "emp_name", "technician"],
    "defect_count": ["defect_count", "defects", "defect", "reject", "rejects", "rejected", "reject_count", "bad_count", "bad_qty", "ng_count", "ng_qty", "scrap", "scrap_count"],
    "energy_consumed": ["energy_consumed", "energy", "energy_kwh", "kwh", "power", "power_consumed", "power_consumption", "electricity", "energy_consumption"],
    "status": ["status", "prod_status", "production_status", "state"],
}

SENSOR_COLUMN_ALIASES = {
    "machine_id": ["machine_id", "machine", "machine_no", "machine_code", "machineid", "mc_id", "equipment_id", "equipment"],
    "temperature": ["temperature", "temp", "temp_c", "temperature_c", "temp_celsius", "machine_temp"],
    "vibration": ["vibration", "vib", "vibration_mm_s", "vib_level", "vibration_level"],
    "power_consumption": ["power_consumption", "power", "power_kw", "kw", "watt", "watts", "energy", "current"],
    "cycle_time": ["cycle_time", "cycle", "cycle_s", "cycle_seconds", "takt_time", "takt"],
    "pressure": ["pressure", "press", "pressure_bar", "bar", "psi"],
    "humidity": ["humidity", "humid", "rh", "relative_humidity", "moisture"],
    "timestamp": ["timestamp", "time", "datetime", "date", "reading_time", "sensor_time", "created_at"],
}


def _find_best_column(df_columns: List[str], aliases: List[str]) -> Optional[str]:
    """Find the best matching column from the DataFrame for a given set of aliases."""
    normalized_df_cols = {col.lower().strip().replace(" ", "_").replace("-", "_"): col for col in df_columns}
    
    for alias in aliases:
        alias_norm = alias.lower().strip().replace(" ", "_").replace("-", "_")
        if alias_norm in normalized_df_cols:
            return normalized_df_cols[alias_norm]
    
    # Fuzzy: check if any alias is a substring of a column or vice versa
    for alias in aliases:
        alias_norm = alias.lower().strip().replace(" ", "_").replace("-", "_")
        for norm_col, orig_col in normalized_df_cols.items():
            if alias_norm in norm_col or norm_col in alias_norm:
                return orig_col
    
    return None


def smart_map_columns(df: pd.DataFrame, alias_map: Dict[str, List[str]]) -> Dict[str, Optional[str]]:
    """Map DataFrame columns to expected DB fields using fuzzy alias matching."""
    mapping = {}
    for db_field, aliases in alias_map.items():
        mapped_col = _find_best_column(df.columns.tolist(), aliases)
        mapping[db_field] = mapped_col
        if mapped_col:
            logger.info(f"Mapped column '{mapped_col}' -> DB field '{db_field}'")
        else:
            logger.warning(f"No column found for DB field '{db_field}'")
    return mapping


def detect_dataset_type(df: pd.DataFrame) -> str:
    """Detect whether the dataset is production data or sensor data."""
    cols_lower = [c.lower().strip().replace(" ", "_").replace("-", "_") for c in df.columns]
    
    sensor_keywords = {"temperature", "temp", "temp_c", "vibration", "vib", "pressure", "humidity", "sensor"}
    production_keywords = {"quantity", "qty", "produced", "target", "shift", "defect", "product", "output", "production"}
    
    sensor_score = sum(1 for c in cols_lower for kw in sensor_keywords if kw in c)
    prod_score = sum(1 for c in cols_lower for kw in production_keywords if kw in c)
    
    logger.info(f"Dataset type detection: sensor_score={sensor_score}, production_score={prod_score}")
    return "sensor_data" if sensor_score > prod_score else "production_logs"


def parse_excel(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse an Excel file into a DataFrame."""
    df = pd.read_excel(io.BytesIO(file_bytes))
    return df


def parse_csv(file_bytes: bytes) -> pd.DataFrame:
    """Parse a CSV file into a DataFrame."""
    df = pd.read_csv(io.BytesIO(file_bytes))
    return df


def detect_columns(df: pd.DataFrame) -> Dict[str, str]:
    """Return a mapping of original column names to normalized names."""
    columns = df.columns.tolist()
    mapping = {col: col.lower().replace(" ", "_") for col in columns}
    return mapping


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    """Fill missing values: numeric with median, categorical with mode."""
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if pd.notna(median_val) else 0)
        else:
            mode_vals = df[col].mode()
            df[col] = df[col].fillna(mode_vals[0] if not mode_vals.empty else "Unknown")
    return df


def _safe_int(val, default=0) -> int:
    """Safely convert a value to int."""
    try:
        if pd.isna(val):
            return default
        return int(float(val))
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=0.0) -> float:
    """Safely convert a value to float."""
    try:
        if pd.isna(val):
            return default
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_datetime(val, default=None):
    """Safely convert a value to datetime."""
    try:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return default or pd.Timestamp.now()
        return pd.to_datetime(val)
    except (ValueError, TypeError):
        return default or pd.Timestamp.now()


async def _ensure_machines_exist(machine_ids: list, db: AsyncSession, machine_info: Dict = None):
    """Create Machine records for any machine_ids not already in the database."""
    if machine_info is None:
        machine_info = {}
    for mid in machine_ids:
        mid_str = str(mid)
        exists = (await db.execute(select(Machine).where(Machine.machine_id == mid_str))).scalar_one_or_none()
        if not exists:
            info = machine_info.get(mid_str, {})
            new_machine = Machine(
                machine_id=mid_str,
                name=info.get("name", f"Machine {mid_str}"),
                type=info.get("type", "General"),
                capacity_per_hour=info.get("capacity", 100),
                status="running",
                health_score=85.0
            )
            db.add(new_machine)
    await db.commit()


async def insert_production_data(df: pd.DataFrame, db: AsyncSession) -> int:
    """Insert production data using intelligent column mapping."""
    col_map = smart_map_columns(df, PRODUCTION_COLUMN_ALIASES)
    
    # Get unique machine IDs
    machine_col = col_map.get("machine_id")
    if machine_col:
        machine_ids = df[machine_col].dropna().unique().tolist()
    else:
        machine_ids = ["M101"]
    
    await _ensure_machines_exist([str(m) for m in machine_ids], db)
    
    inserted = 0
    for _, row in df.iterrows():
        def get_val(field):
            mapped_col = col_map.get(field)
            if mapped_col and mapped_col in row.index:
                return row[mapped_col]
            return None
        
        machine_id = str(get_val("machine_id") or "M101")
        product_type = str(get_val("product_type") or "TypeA")
        quantity_produced = _safe_int(get_val("quantity_produced"))
        target_quantity = _safe_int(get_val("target_quantity"))
        start_time = _safe_datetime(get_val("start_time"))
        end_time = _safe_datetime(get_val("end_time"), default=start_time)
        shift = str(get_val("shift") or "Morning")
        operator_name = str(get_val("operator_name") or "") if get_val("operator_name") else None
        defect_count = _safe_int(get_val("defect_count"))
        energy_consumed = _safe_float(get_val("energy_consumed"))
        status = str(get_val("status") or "completed")
        
        # If quantity is still 0 but there are unmapped numeric columns, try to use the first large numeric col
        if quantity_produced == 0 and target_quantity == 0:
            for c in df.columns:
                if pd.api.types.is_numeric_dtype(df[c]) and col_map.get("quantity_produced") != c:
                    val = _safe_int(row[c])
                    if val > 0:
                        quantity_produced = val
                        target_quantity = int(val * 1.1)  # assume 10% target overhead
                        break
        
        log = ProductionLog(
            machine_id=machine_id,
            product_type=product_type,
            quantity_produced=quantity_produced,
            target_quantity=target_quantity,
            start_time=start_time,
            end_time=end_time,
            shift=shift,
            operator_name=operator_name,
            defect_count=defect_count,
            energy_consumed=energy_consumed,
            status=status,
        )
        db.add(log)
        inserted += 1
    await db.commit()
    logger.info(f"Inserted {inserted} production records. Column mapping: {col_map}")
    return inserted


async def insert_sensor_data(df: pd.DataFrame, db: AsyncSession) -> int:
    """Insert sensor data using intelligent column mapping."""
    col_map = smart_map_columns(df, SENSOR_COLUMN_ALIASES)
    
    machine_col = col_map.get("machine_id")
    if machine_col:
        machine_ids = df[machine_col].dropna().unique().tolist()
    else:
        machine_ids = ["M101"]
    
    await _ensure_machines_exist([str(m) for m in machine_ids], db)
    
    inserted = 0
    for _, row in df.iterrows():
        def get_val(field):
            mapped_col = col_map.get(field)
            if mapped_col and mapped_col in row.index:
                return row[mapped_col]
            return None
        
        sensor = SensorData(
            machine_id=str(get_val("machine_id") or "M101"),
            temperature=_safe_float(get_val("temperature")),
            vibration=_safe_float(get_val("vibration")),
            power_consumption=_safe_float(get_val("power_consumption")),
            cycle_time=_safe_float(get_val("cycle_time")),
            pressure=_safe_float(get_val("pressure")),
            humidity=_safe_float(get_val("humidity")),
            timestamp=_safe_datetime(get_val("timestamp")),
        )
        db.add(sensor)
        inserted += 1
    await db.commit()
    logger.info(f"Inserted {inserted} sensor records. Column mapping: {col_map}")
    return inserted
