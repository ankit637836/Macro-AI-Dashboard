import yfinance as yf
import pandas as pd
from dotenv import load_dotenv
load_dotenv()

MARKETS = {
    "CL": "CL=F",       # WTI Crude Oil
    "BZ": "BZ=F",       # Brent Crude
    "GC": "GC=F",       # Gold
    "DXY": "DX-Y.NYB",  # US Dollar Index
    "NG": "NG=F",       # Natural Gas
}

def fetch_yahoo_market(ticker_key, start="2022-01-01", end=None):
    ticker = MARKETS.get(ticker_key)
    if not ticker:
        raise ValueError(f"Unknown ticker: {ticker_key}")
    df = yf.download(ticker, start=start, end=end, progress=False, auto_adjust=True)
    df = df[["Close"]].copy()
    df.columns = ["price"]
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df.index = df.index.date
    df.index.name = "date"
    df["market"] = ticker_key
    df["pct_change"] = df["price"].pct_change() * 100
    return df

def fetch_all_markets(start="2022-01-01"):
    all_data = {}
    for key in MARKETS:
        print(f"Fetching {key}...")
        try:
            df = fetch_yahoo_market(key, start=start)
            all_data[key] = df
            print(f"  Got {len(df)} rows")
        except Exception as e:
            print(f"  Error: {e}")
    return all_data

if __name__ == "__main__":
    data = fetch_all_markets()
    for key, df in data.items():
        print(f"\n--- {key} ---")
        print(df.tail(3))