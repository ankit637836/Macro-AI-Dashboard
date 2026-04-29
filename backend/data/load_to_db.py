import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from data.fetch_futures import fetch_sofr_curve, fetch_fed_funds_rate
from data.fetch_events import fetch_macro_events, compute_mom_change
from data.fetch_yahoo import fetch_all_markets
from data.fetch_fomc import fetch_fomc_decisions, fetch_sonia

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
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS market_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                market TEXT NOT NULL,
                price REAL,
                pct_change REAL,
                UNIQUE(date, market)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS fomc_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                rate REAL,
                prev_rate REAL,
                change_bps REAL,
                decision TEXT
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sonia_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                rate REAL,
                pct_change REAL
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


def load_market_prices():
    all_markets = fetch_all_markets()
    all_rows = []
    for market_key, df in all_markets.items():
        df = df.reset_index()
        df["date"] = df["date"].astype(str)
        df = df[["date", "market", "price", "pct_change"]].dropna(subset=["price"])
        all_rows.append(df)
    final_df = pd.concat(all_rows, ignore_index=True)
    final_df.to_sql("market_prices", engine, if_exists="replace", index=False)
    print(f"Loaded {len(final_df)} market price rows.")


def load_fomc_events():
    df = fetch_fomc_decisions()
    df = df.reset_index()
    df["date"] = df["date"].astype(str)
    df = df[["date", "rate", "prev_rate", "change_bps", "decision"]]
    df.to_sql("fomc_events", engine, if_exists="replace", index=False)
    print(f"Loaded {len(df)} FOMC decision rows.")


def load_sonia():
    df = fetch_sonia()
    df = df.reset_index()
    df["date"] = df["date"].astype(str)
    df = df[["date", "rate", "pct_change"]].dropna(subset=["rate"])
    df.to_sql("sonia_rates", engine, if_exists="replace", index=False)
    print(f"Loaded {len(df)} SONIA rows.")


if __name__ == "__main__":
    print("Creating tables...")
    create_tables()

    print("\nLoading SOFR curve data...")
    load_sofr_curve()

    print("\nLoading Fed Funds data...")
    load_fed_funds()

    print("\nLoading macro events...")
    load_macro_events()

    print("\nLoading market prices (Yahoo Finance)...")
    load_market_prices()

    print("\nLoading FOMC decisions...")
    load_fomc_events()

    print("\nLoading SONIA rates...")
    load_sonia()

    print("\nAll data loaded successfully!")