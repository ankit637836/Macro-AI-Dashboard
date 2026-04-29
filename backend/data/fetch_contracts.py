import pandas as pd
import numpy as np
from fredapi import Fred
from dotenv import load_dotenv
import os
load_dotenv()

fred = Fred(api_key=os.getenv("FRED_API_KEY"))

# Term SOFR series from FRED
SOFR_SERIES = {
    "1m":  "SOFR30DAYAVG",
    "3m":  "SOFR90DAYAVG",
    "6m":  "SOFR180DAYAVG",
    "12m": "SOFR180DAYAVG",
}

# Contract month codes
MONTH_CODES = {
    3: "Mar", 6: "Jun", 9: "Sep", 12: "Dec"
}

def fetch_sofr_term_rates(start="2022-01-01"):
    """Fetch all Term SOFR maturities"""
    all_data = {}
    for label, series_id in SOFR_SERIES.items():
        try:
            series = fred.get_series(series_id, observation_start=start)
            all_data[label] = series
        except Exception as e:
            print(f"Error fetching {series_id}: {e}")
    return pd.DataFrame(all_data)

def reconstruct_sr3_prices(start="2022-01-01"):
    print("Reconstructing SR3 contract prices...")
    df = fetch_sofr_term_rates(start=start)
    df = df.dropna(how='all')

    contracts = []
    for year in range(2022, 2028):
        for month in [3, 6, 9, 12]:
            label = f"{MONTH_CODES[month]}{str(year)[2:]}"
            contracts.append({
                "label": label,
                "year": year,
                "month": month,
                "expiry": pd.Timestamp(year=year, month=month, day=15)
            })

    result = {}

    for c in contracts:
        expiry = c["expiry"]
        label  = c["label"]
        prices = []

        for date, row in df.iterrows():
            months_to_expiry = (expiry - date).days / 30.0

            # Interpolate between available tenors
            r1m  = row.get("1m",  np.nan)
            r3m  = row.get("3m",  np.nan)
            r6m  = row.get("6m",  np.nan)
            r12m = row.get("12m", np.nan)

            if months_to_expiry <= 0:
                rate = r1m
            elif months_to_expiry <= 1:
                rate = r1m
            elif months_to_expiry <= 3:
                # interpolate between 1m and 3m
                t = (months_to_expiry - 1) / 2.0
                rate = r1m * (1 - t) + r3m * t if pd.notna(r1m) and pd.notna(r3m) else r3m
            elif months_to_expiry <= 6:
                # interpolate between 3m and 6m
                t = (months_to_expiry - 3) / 3.0
                rate = r3m * (1 - t) + r6m * t if pd.notna(r3m) and pd.notna(r6m) else r6m
            elif months_to_expiry <= 12:
                # interpolate between 6m and 12m
                t = (months_to_expiry - 6) / 6.0
                rate = r6m * (1 - t) + r12m * t if pd.notna(r6m) and pd.notna(r12m) else r12m
            else:
                # beyond 12m — extrapolate slightly using 12m + small term premium
                extra_months = months_to_expiry - 12
                term_premium = extra_months * 0.002  # 0.2 bps per extra month
                rate = r12m + term_premium if pd.notna(r12m) else np.nan

            if pd.notna(rate):
                prices.append({"date": date, "price": round(100 - rate, 4)})

        if prices:
            result[label] = pd.DataFrame(prices).set_index("date")["price"]

    return pd.DataFrame(result)

def reconstruct_zq_prices(start="2022-01-01"):
    """
    Reconstructs ZQ (Fed Funds) contract prices.
    ZQ price = 100 - expected Fed Funds rate for that month.
    """
    print("Reconstructing ZQ contract prices...")
    series = fred.get_series("EFFR", observation_start=start)
    df = series.to_frame(name="rate").dropna()
    
    # Monthly contracts
    contracts = []
    for year in range(2022, 2028):
        for month in range(1, 13):
            import calendar
            month_name = calendar.month_abbr[month]
            label = f"{month_name}{str(year)[2:]}"
            contracts.append({
                "label": label,
                "year": year,
                "month": month,
                "expiry": pd.Timestamp(year=year, month=month, day=28)
            })
    
    result = {}
    for c in contracts:
        expiry = c["expiry"]
        label = c["label"]
        prices = []
        for date, row in df.iterrows():
            days_to_expiry = (expiry - date).days
            if days_to_expiry >= 0:
                price = round(100 - row["rate"], 4)
                prices.append({"date": date, "price": price})
        if prices:
            result[label] = pd.DataFrame(prices).set_index("date")["price"]
    
    return pd.DataFrame(result)

if __name__ == "__main__":
    sr3 = reconstruct_sr3_prices()
    print("\n--- SR3 Contract Prices (sample) ---")
    print(sr3[["Jun26", "Sep26", "Dec26"]].tail(5))
    
    zq = reconstruct_zq_prices()
    print("\n--- ZQ Contract Prices (sample) ---")
    cols = [c for c in zq.columns if "26" in c][:3]
    print(zq[cols].tail(5))