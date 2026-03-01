import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from data.fetch_futures import fetch_sofr_curve, fetch_fed_funds_rate
from data.fetch_events import fetch_macro_events, compute_mom_change

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def create_tables():
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sofr_curve (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                maturity TEXT NOT NULL,
                rate REAL,
                UNIQUE(date, maturity)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fed_funds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                rate REAL
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS macro_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                indicator TEXT NOT NULL,
                value REAL,
                mom_change REAL,
                pct_change REAL,
                UNIQUE(date, indicator)
            )
        """))
        conn.commit()
    print("Tables created successfully.")


def load_sofr_curve():
    df = fetch_sofr_curve()
    rows = []
    for date, row in df.iterrows():
        for maturity, rate in row.items():
            if pd.notna(rate):
                rows.append({
                    "date": str(date.date()),
                    "maturity": maturity,
                    "rate": float(rate)
                })
    df_to_insert = pd.DataFrame(rows)
    df_to_insert.to_sql("sofr_curve", engine, if_exists="replace", index=False)
    print(f"Loaded {len(df_to_insert)} SOFR curve rows.")


def load_fed_funds():
    df = fetch_fed_funds_rate()
    df = df.dropna()
    df.index = df.index.map(lambda x: str(x.date()))
    df.index.name = "date"
    df = df.reset_index()
    df.columns = ["date", "rate"]
    df.to_sql("fed_funds", engine, if_exists="replace", index=False)
    print(f"Loaded {len(df)} Fed Funds rows.")


def load_macro_events():
    events = fetch_macro_events()
    all_rows = []
    for indicator, df in events.items():
        df = compute_mom_change(df)
        df = df.dropna(subset=["value"])
        df.index = df.index.map(lambda x: str(x.date()))
        df.index.name = "date"
        df = df.reset_index()
        df = df[["date", "indicator", "value", "mom_change", "pct_change"]]
        all_rows.append(df)

    final_df = pd.concat(all_rows, ignore_index=True)
    final_df.to_sql("macro_events", engine, if_exists="replace", index=False)
    print(f"Loaded {len(final_df)} macro event rows.")


if __name__ == "__main__":
    print("Creating tables...")
    create_tables()
    print("\nLoading SOFR curve data...")
    load_sofr_curve()
    print("\nLoading Fed Funds data...")
    load_fed_funds()
    print("\nLoading macro events...")
    load_macro_events()
    print("\nAll data loaded successfully!")
