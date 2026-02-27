import pandas as pd
from fredapi import Fred
from dotenv import load_dotenv
import os

load_dotenv()

fred = Fred(api_key=os.getenv("FRED_API_KEY"))

# SOFR futures - these are the FRED series IDs for SOFR rates by maturity
SOFR_SERIES = {
    "1m": "SOFR1",
    "sofr_rate": "SOFR",          # overnight SOFR rate
    "term_1m": "SOFRRATE",        # we'll use actual SOFR + term rates
}

# For the futures curve, we'll use Term SOFR rates as a proxy
TERM_SOFR_SERIES = {
    "overnight": "SOFR",
    "30d_avg":   "SOFR30DAYAVG",
    "90d_avg":   "SOFR90DAYAVG",
    "180d_avg":  "SOFR180DAYAVG",
}

def fetch_sofr_curve(start_date="2022-01-01", end_date=None):
    """
    Fetches Term SOFR rates across maturities to represent the forward curve.
    Returns a combined DataFrame with date as index and maturities as columns.
    """
    all_data = {}

    for label, series_id in TERM_SOFR_SERIES.items():
        print(f"Fetching SOFR {label}...")
        try:
            series = fred.get_series(series_id, observation_start=start_date, observation_end=end_date)
            all_data[label] = series
        except Exception as e:
            print(f"Error fetching {series_id}: {e}")

    df = pd.DataFrame(all_data)
    df.index.name = "date"
    df = df.dropna(how="all")
    return df


def fetch_fed_funds_rate(start_date="2022-01-01", end_date=None):
    """
    Fetches the Effective Federal Funds Rate from FRED.
    """
    print("Fetching Fed Funds Rate...")
    series = fred.get_series("EFFR", observation_start=start_date, observation_end=end_date)
    df = series.to_frame(name="fed_funds_rate")
    df.index.name = "date"
    return df


if __name__ == "__main__":
    sofr_df = fetch_sofr_curve()
    print("\n--- SOFR Curve Sample ---")
    print(sofr_df.tail(10))

    ff_df = fetch_fed_funds_rate()
    print("\n--- Fed Funds Rate Sample ---")
    print(ff_df.tail(10))
