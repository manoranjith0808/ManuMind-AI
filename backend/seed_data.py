"""Seed script to populate the database with realistic sample manufacturing data.

Run with: python seed_data.py
"""
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import random
from passlib.context import CryptContext

# Ensure the app module is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import Base
from app.models.user import User
from app.models.machine import Machine
from app.models.production import ProductionLog
from app.models.sensor import SensorData
from app.models.quality import QualityMetric

# Create sync engine
sync_url = settings.DATABASE_URL.replace("+aiosqlite", "").replace("+asyncpg", "")
engine = create_engine(sync_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

MACHINE_CONFIGS = [
    {"id": "M101", "name": "CNC Mill Alpha", "type": "CNC", "capacity": 120, "health": 92.5},
    {"id": "M102", "name": "CNC Lathe Beta", "type": "CNC", "capacity": 100, "health": 78.3},
    {"id": "M103", "name": "Assembly Line 1", "type": "Assembly", "capacity": 200, "health": 88.1},
    {"id": "M104", "name": "Assembly Line 2", "type": "Assembly", "capacity": 180, "health": 95.2},
    {"id": "M105", "name": "Welding Station A", "type": "Welding", "capacity": 80, "health": 71.6},
    {"id": "M106", "name": "Injection Molder X", "type": "Injection", "capacity": 150, "health": 84.9},
    {"id": "M107", "name": "Packaging Unit 1", "type": "Packaging", "capacity": 250, "health": 91.0},
    {"id": "M108", "name": "Packaging Unit 2", "type": "Packaging", "capacity": 220, "health": 87.4},
]

PRODUCT_TYPES = ["Product_A", "Product_B", "Product_C", "Product_D"]
SHIFTS = ["Morning", "Afternoon", "Night"]
OPERATORS = [f"Operator_{i}" for i in range(1, 11)]
DEFECT_TYPES = ["Scratch", "Dent", "Misalignment", "Color Defect", "Size Deviation", "Surface Crack"]
STATUSES = ["running", "running", "running", "running", "running", "idle", "maintenance"]


def seed_data():
    """Populate the database with comprehensive sample data."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("🏭 ManuMind AI - Database Seeder")
        print("=" * 50)

        # 1. Create Admin User
        if not db.query(User).filter(User.email == "admin@manumind.ai").first():
            admin = User(
                email="admin@manumind.ai",
                username="admin",
                full_name="Factory Admin",
                role="admin",
                hashed_password=pwd_context.hash("admin123")
            )
            db.add(admin)
            db.commit()
            print("✅ Admin user created (admin@manumind.ai / admin123)")
        else:
            print("ℹ️  Admin user already exists")

        # 2. Create Machines
        machines_created = 0
        for config in MACHINE_CONFIGS:
            if not db.query(Machine).filter(Machine.machine_id == config["id"]).first():
                m = Machine(
                    machine_id=config["id"],
                    name=config["name"],
                    type=config["type"],
                    capacity_per_hour=config["capacity"],
                    status=random.choice(STATUSES),
                    health_score=config["health"],
                )
                db.add(m)
                machines_created += 1
        db.commit()
        print(f"✅ {machines_created} machines created ({', '.join(c['id'] for c in MACHINE_CONFIGS)})")

        # 3. Generate 30 days of production data
        now = datetime.utcnow()
        production_count = 0
        quality_count = 0
        sensor_count = 0

        machine_records = db.query(Machine).all()

        for day_offset in range(30):
            current_date = now - timedelta(days=day_offset)
            date_start = current_date.replace(hour=0, minute=0, second=0, microsecond=0)

            for m in machine_records:
                # Generate 3 shifts per day per machine
                for shift_idx, shift in enumerate(SHIFTS):
                    shift_start = date_start + timedelta(hours=shift_idx * 8)
                    shift_end = shift_start + timedelta(hours=8)

                    # Realistic production with variation
                    base_production = int(m.capacity_per_hour * 8 * random.uniform(0.6, 0.95))
                    target = m.capacity_per_hour * 8
                    defect_rate = random.uniform(0.005, 0.04)  # 0.5% to 4% defect rate
                    defects = max(0, int(base_production * defect_rate))

                    # Add anomalies for realism
                    if day_offset == 2 and m.machine_id == "M102":
                        base_production = int(base_production * 0.3)  # M102 had a bad day 2 days ago
                        defects = int(defects * 3)

                    if day_offset == 5 and m.machine_id == "M105":
                        base_production = 0  # M105 was down 5 days ago
                        defects = 0

                    prod = ProductionLog(
                        machine_id=m.machine_id,
                        product_type=random.choice(PRODUCT_TYPES),
                        quantity_produced=base_production,
                        target_quantity=target,
                        start_time=shift_start,
                        end_time=shift_end,
                        shift=shift,
                        operator_name=random.choice(OPERATORS),
                        defect_count=defects,
                        energy_consumed=round(random.uniform(15.0, 55.0), 2),
                    )
                    db.add(prod)
                    production_count += 1

                    # Quality metric per shift
                    qm = QualityMetric(
                        machine_id=m.machine_id,
                        product_type=prod.product_type,
                        defect_count=defects,
                        defect_rate=round(defects / max(base_production, 1) * 100, 2),
                        inspection_count=base_production,
                        pass_count=base_production - defects,
                        timestamp=shift_start,
                    )
                    db.add(qm)
                    quality_count += 1

                # Sensor readings every 4 hours (6 per day per machine)
                for hour_offset in range(0, 24, 4):
                    sensor_time = date_start + timedelta(hours=hour_offset)

                    # Realistic sensor patterns
                    base_temp = 55.0 + (m.capacity_per_hour / 50.0) * 5  # Higher capacity = more heat
                    temp_variation = random.gauss(0, 3)

                    # Anomalous sensors for M102 and M105
                    if m.machine_id == "M102" and day_offset <= 3:
                        base_temp += 15  # Running hot recently
                    if m.machine_id == "M105" and day_offset <= 5:
                        base_temp += 10

                    sensor = SensorData(
                        machine_id=m.machine_id,
                        temperature=round(base_temp + temp_variation + random.uniform(-2, 5), 1),
                        vibration=round(random.uniform(0.5, 4.5) + (0 if m.health_score > 80 else 2.0), 2),
                        power_consumption=round(random.uniform(8.0, 28.0), 1),
                        cycle_time=round(random.uniform(12.0, 35.0), 1),
                        pressure=round(random.uniform(1.5, 8.0), 1),
                        humidity=round(random.uniform(35.0, 65.0), 1),
                        timestamp=sensor_time,
                    )
                    db.add(sensor)
                    sensor_count += 1

            # Commit in batches (per day) to avoid memory issues
            if day_offset % 5 == 0:
                db.commit()

        db.commit()
        print(f"✅ {production_count} production logs generated (30 days × 8 machines × 3 shifts)")
        print(f"✅ {quality_count} quality metrics generated")
        print(f"✅ {sensor_count} sensor readings generated (every 4 hours)")
        print("=" * 50)
        print("🎉 Database seeding complete!")
        print("\n📋 Login credentials: admin@manumind.ai / admin123")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
