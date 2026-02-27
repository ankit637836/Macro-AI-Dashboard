import pandas as pd
from fredapi import Fred
from dotenv import load_dotenv
import os

load_dotenv()

fred = Fred(api_key=os.getenv("FRED_API_KEY"))

# FRED series for macro events - actual released values
MACRO_SERIES = {
    "CPI":          "CPIAUCSL",       # Consumer Price Index
    "CORE_CPI":     "CPILFESL",       # Core CPI (ex food & energy)
    "NFP":          "PAYEMS",         # Nonfarm Payrolls
    "UNEMPLOYMENT": "UNRATE",         # Unemployment Rate
    "GDP":          "GDP",            # Gross Domestic Product
    "PCE":          "PCE",            # Personal Consumption Expenditure
}

def fetch_macro_events(start_date="2022-01-01", end_date=None):
    """
    Fetches macro economic release data from FRED.
    Returns a dict of DataFrames, one per indicator.
    """
    all_data = {}

    for label, series_id in MACRO_SERIES.items():
        print(f"Fetching {label}...")
        try:
            series = fred.get_series(series_id, observation_start=start_date, observation_end=end_date)
            df = series.to_frame(name="value")
            df.index.name = "date"
            df["indicator"] = label
            all_data[label] = df
        except Exception as e:
            print(f"Error fetching {label}: {e}")

    return all_data


def compute_mom_change(df):
    """
    Computes month-over-month change for a series.
    Useful for CPI, NFP where the change matters more than absolute value.
    """
    df = df.copy()
    df["mom_change"] = df["value"].diff()
    df["pct_change"] = df["value"].pct_change() * 100
    return df


if __name__ == "__main__":
    events = fetch_macro_events()

    for indicator, df in events.items():
        df = compute_mom_change(df)
        print(f"\n--- {indicator} (last 5 releases) ---")
        print(df.tail(5))