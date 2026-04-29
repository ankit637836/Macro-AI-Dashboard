import pandas as pd
from fredapi import Fred
from dotenv import load_dotenv
import os
load_dotenv()

fred = Fred(api_key=os.getenv("FRED_API_KEY"))

def fetch_fomc_decisions(start="2022-01-01"):
    """
    Fetches Fed Funds target rate from FRED.
    Changes in the rate = FOMC rate decisions.
    """
    print("Fetching Fed Funds target rate...")
    series = fred.get_series("DFEDTARU", observation_start=start)
    df = series.to_frame(name="rate")
    df.index.name = "date"
    df["prev_rate"] = df["rate"].shift(1)
    df["change_bps"] = (df["rate"] - df["prev_rate"]) * 100
    # Keep only dates where rate changed = actual FOMC decisions
    decisions = df[df["change_bps"] != 0].copy()
    decisions["decision"] = decisions["change_bps"].apply(
        lambda x: "cut" if x < 0 else "hike" if x > 0 else "hold"
    )
    decisions = decisions.dropna()
    return decisions

def fetch_sonia(start="2022-01-01"):
    """Fetches SONIA rate from FRED"""
    print("Fetching SONIA...")
    series = fred.get_series("IUDSOIA", observation_start=start)
    df = series.to_frame(name="rate")
    df.index.name = "date"
    df["market"] = "SONIA"
    df["pct_change"] = df["rate"].pct_change() * 100
    return df

if __name__ == "__main__":
    fomc = fetch_fomc_decisions()
    print("\n--- FOMC Decisions ---")
    print(fomc.tail(10))
    
    sonia = fetch_sonia()
    print("\n--- SONIA ---")
    print(sonia.tail(5))