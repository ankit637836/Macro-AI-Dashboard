from dotenv import load_dotenv
import os
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "message": "Macro AI API is running"}


@router.get("/curve")
def get_curve(date: str = None, db: Session = Depends(get_db)):
    """
    Returns SOFR curve for a specific date.
    If no date given, returns the latest available date.
    """
    if date:
        rows = db.execute(
            text("SELECT date, maturity, rate FROM sofr_curve WHERE date = :date"),
            {"date": date}
        ).fetchall()
    else:
        latest = db.execute(
            text("SELECT MAX(date) as max_date FROM sofr_curve")
        ).fetchone()
        rows = db.execute(
            text("SELECT date, maturity, rate FROM sofr_curve WHERE date = :date"),
            {"date": latest.max_date}
        ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No curve data found for this date")

    return {
        "date": rows[0].date,
        "curve": {row.maturity: row.rate for row in rows}
    }


@router.get("/curve/range")
def get_curve_range(start: str, end: str, maturity: str = "90d_avg", db: Session = Depends(get_db)):
    """
    Returns a single maturity's rate over a date range.
    Useful for plotting how rates moved over time.
    """
    rows = db.execute(
        text("""
            SELECT date, rate FROM sofr_curve
            WHERE date BETWEEN :start AND :end
            AND maturity = :maturity
            ORDER BY date ASC
        """),
        {"start": start, "end": end, "maturity": maturity}
    ).fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No data found for this range")

    return {
        "maturity": maturity,
        "data": [{"date": r.date, "rate": r.rate} for r in rows]
    }


@router.get("/events")
def get_events(indicator: str = None, db: Session = Depends(get_db)):
    """
    Returns all macro events. Optionally filter by indicator (CPI, NFP, GDP etc.)
    """
    if indicator:
        rows = db.execute(
            text("""
                SELECT date, indicator, value, mom_change, pct_change
                FROM macro_events
                WHERE indicator = :indicator
                ORDER BY date DESC
            """),
            {"indicator": indicator.upper()}
        ).fetchall()
    else:
        rows = db.execute(
            text("""
                SELECT date, indicator, value, mom_change, pct_change
                FROM macro_events
                ORDER BY date DESC
            """)
        ).fetchall()

    return {
        "count": len(rows),
        "events": [
            {
                "date": r.date,
                "indicator": r.indicator,
                "value": r.value,
                "mom_change": r.mom_change,
                "pct_change": r.pct_change
            } for r in rows
        ]
    }


@router.get("/event-impact")
def get_event_impact(indicator: str, date: str, window: int = 5, db: Session = Depends(get_db)):
    """
    For a given macro event (e.g. CPI on 2024-01-11),
    returns SOFR curve rates in a window of days before and after.
    This shows how the curve moved around the event.
    """
    # Get the event
    event = db.execute(
        text("""
            SELECT date, indicator, value, mom_change, pct_change
            FROM macro_events
            WHERE indicator = :indicator AND date = :date
        """),
        {"indicator": indicator.upper(), "date": date}
    ).fetchone()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get curve data around the event date
    rows = db.execute(
        text("""
            SELECT date, maturity, rate FROM sofr_curve
            WHERE date BETWEEN date(:date, :before) AND date(:date, :after)
            ORDER BY date ASC, maturity ASC
        """),
        {
            "date": date,
            "before": f"-{window} days",
            "after": f"+{window} days"
        }
    ).fetchall()

    # Restructure into date -> curve shape
    curve_by_date = {}
    for r in rows:
        if r.date not in curve_by_date:
            curve_by_date[r.date] = {}
        curve_by_date[r.date][r.maturity] = r.rate

    return {
        "event": {
            "date": event.date,
            "indicator": event.indicator,
            "value": event.value,
            "mom_change": event.mom_change,
            "pct_change": event.pct_change
        },
        "curve_window": curve_by_date
    }


@router.get("/fed-funds")
def get_fed_funds(start: str = None, end: str = None, db: Session = Depends(get_db)):
    """
    Returns Fed Funds rate over a date range.
    """
    if start and end:
        rows = db.execute(
            text("SELECT date, rate FROM fed_funds WHERE date BETWEEN :start AND :end ORDER BY date ASC"),
            {"start": start, "end": end}
        ).fetchall()
    else:
        rows = db.execute(
            text("SELECT date, rate FROM fed_funds ORDER BY date DESC LIMIT 30")
        ).fetchall()

    return {
        "data": [{"date": r.date, "rate": r.rate} for r in rows]
    }

@router.get("/ai-summary")
def get_ai_summary(indicator: str, date: str, db: Session = Depends(get_db)):
    """
    Generates an AI summary of a macro event's impact on SOFR rates.
    """
    
    import os

    # Get the event
    event = db.execute(
        text("""
            SELECT date, indicator, value, mom_change, pct_change
            FROM macro_events
            WHERE indicator = :indicator AND date = :date
        """),
        {"indicator": indicator.upper(), "date": date}
    ).fetchone()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get curve data around the event
    rows = db.execute(
        text("""
            SELECT date, maturity, rate FROM sofr_curve
            WHERE date BETWEEN date(:date, '-7 days') AND date(:date, '+7 days')
            ORDER BY date ASC
        """),
        {"date": date}
    ).fetchall()

    # Build curve summary
    curve_by_date = {}
    for r in rows:
        if r.date not in curve_by_date:
            curve_by_date[r.date] = {}
        curve_by_date[r.date][r.maturity] = round(r.rate, 4)

    dates = sorted(curve_by_date.keys())
    curve_before = curve_by_date.get(dates[0], {}) if dates else {}
    curve_after  = curve_by_date.get(dates[-1], {}) if dates else {}

    # Build prompt
    prompt = f"""You are a fixed income analyst specializing in short-term interest rate futures.

A macro economic event occurred:
- Indicator: {event.indicator}
- Release Date: {event.date}
- Value: {event.value}
- Month-over-Month Change: {event.mom_change}
- Percent Change: {round(event.pct_change, 4) if event.pct_change else 'N/A'}%

SOFR curve before the event: {curve_before}
SOFR curve after the event:  {curve_after}

Write a concise 3-4 paragraph analyst note explaining:
1. What the data showed and whether it was hawkish or dovish
2. How the SOFR curve moved in response (reference specific maturities and basis point changes)
3. What this implies for the Fed rate path and short-term rate expectations
4. Any key spread or butterfly movements worth noting

Write in a professional but clear style. Use basis points (bps) when referencing rate changes. Be specific with numbers."""

    from google import genai as google_genai
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    client_ai = google_genai.Client(api_key=gemini_key)
    response = client_ai.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )
    summary = response.text

    return {
        "event": {
            "date": event.date,
            "indicator": event.indicator,
            "value": event.value,
            "mom_change": event.mom_change,
        },
        "curve_before": curve_before,
        "curve_after": curve_after,
        "summary": summary
    }


@router.get("/admin/load-data")
def load_data_endpoint():
    """
    One-time endpoint to load all data into the database.
    Call this once after deployment to populate the database.
    """
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from data.load_to_db import create_tables, load_sofr_curve, load_fed_funds, load_macro_events
    
    try:
        create_tables()
        load_sofr_curve()
        load_fed_funds()
        load_macro_events()
        return {"status": "success", "message": "All data loaded successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/markets")
def get_markets(market: str = None, start: str = None, end: str = None, db: Session = Depends(get_db)):
    """
    Returns historical prices for CL, BZ, GC, DXY, NG, SONIA.
    """
    query = "SELECT date, market, price, pct_change FROM market_prices WHERE 1=1"
    params = {}
    if market:
        query += " AND market = :market"
        params["market"] = market.upper()
    if start:
        query += " AND date >= :start"
        params["start"] = start
    if end:
        query += " AND date <= :end"
        params["end"] = end
    query += " ORDER BY date ASC"
    rows = db.execute(text(query), params).fetchall()
    return {
        "count": len(rows),
        "data": [{"date": r.date, "market": r.market, "price": r.price, "pct_change": r.pct_change} for r in rows]
    }


@router.get("/fomc")
def get_fomc_events(db: Session = Depends(get_db)):
    """Returns all FOMC rate decisions."""
    rows = db.execute(
        text("SELECT date, rate, prev_rate, change_bps, decision FROM fomc_events ORDER BY date DESC")
    ).fetchall()
    return {
        "count": len(rows),
        "events": [{"date": r.date, "rate": r.rate, "prev_rate": r.prev_rate,
                    "change_bps": r.change_bps, "decision": r.decision} for r in rows]
    }


@router.get("/cross-market")
def get_cross_market(indicator: str, date: str, window: int = 5, db: Session = Depends(get_db)):
    """
    For a given macro event, returns all markets' price movements in a window around it.
    Markets: SOFR, Fed Funds, CL, BZ, GC, DXY, NG, SONIA.
    """
    # Get the macro event
    event = db.execute(
        text("SELECT date, indicator, value, mom_change FROM macro_events WHERE indicator = :indicator AND date = :date"),
        {"indicator": indicator.upper(), "date": date}
    ).fetchone()

    # Also check FOMC events
    if not event and indicator.upper() == "FOMC":
        event = db.execute(
            text("SELECT date, decision as indicator, change_bps as mom_change, rate as value FROM fomc_events WHERE date = :date"),
            {"date": date}
        ).fetchone()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Get market prices around the event
    market_rows = db.execute(
        text("""
            SELECT date, market, price, pct_change FROM market_prices
            WHERE date BETWEEN date(:date, :before) AND date(:date, :after)
            ORDER BY market, date ASC
        """),
        {"date": date, "before": f"-{window} days", "after": f"+{window} days"}
    ).fetchall()

    # Get SOFR around the event
    sofr_rows = db.execute(
        text("""
            SELECT date, maturity, rate FROM sofr_curve
            WHERE date BETWEEN date(:date, :before) AND date(:date, :after)
            AND maturity = '90d_avg'
            ORDER BY date ASC
        """),
        {"date": date, "before": f"-{window} days", "after": f"+{window} days"}
    ).fetchall()

    # Get SONIA around the event
    sonia_rows = db.execute(
        text("""
            SELECT date, rate FROM sonia_rates
            WHERE date BETWEEN date(:date, :before) AND date(:date, :after)
            ORDER BY date ASC
        """),
        {"date": date, "before": f"-{window} days", "after": f"+{window} days"}
    ).fetchall()

    # Organize by market
    markets = {}
    for r in market_rows:
        if r.market not in markets:
            markets[r.market] = []
        markets[r.market].append({"date": r.date, "price": r.price, "pct_change": r.pct_change})

    # Add SOFR as a market
    if sofr_rows:
        base = sofr_rows[0].rate
        markets["SOFR"] = [{"date": r.date, "price": r.rate,
                             "pct_change": ((r.rate - base) / base * 100) if base else 0} for r in sofr_rows]

    # Add SONIA as a market
    if sonia_rows:
        base = sonia_rows[0].rate
        markets["SONIA"] = [{"date": r.date, "price": r.rate,
                              "pct_change": ((r.rate - base) / base * 100) if base else 0} for r in sonia_rows]

    # Compute summary — pre vs post event change per market
    summary = {}
    for market, data in markets.items():
        if len(data) >= 2:
            pre  = data[0]["price"]
            post = data[-1]["price"]
            if pre and pre != 0:
                summary[market] = round(((post - pre) / abs(pre)) * 100, 4)

    return {
        "event": {
            "date": event.date,
            "indicator": indicator.upper(),
            "value": event.value,
            "mom_change": event.mom_change
        },
        "window_days": window,
        "markets": markets,
        "summary": summary
    }


@router.get("/contract-builder")
def get_contract_builder(
    instrument: str = "SR3",
    leg1: str = None,
    leg2: str = None,
    leg3: str = None,
    leg4: str = None,
    structure: str = "outright",
    start: str = "2022-01-01",
    db: Session = Depends(get_db)
):
    """
    Builds a rate structure from actual contract month prices.
    structure: outright | spread | fly | dfly
    legs: contract month labels e.g. Jun26, Sep26, Dec26
    """
    import pandas as pd
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from data.fetch_contracts import reconstruct_sr3_prices, reconstruct_zq_prices

    # Fetch contract prices
    if instrument.upper() == "SR3":
        df = reconstruct_sr3_prices(start=start)
    else:
        df = reconstruct_zq_prices(start=start)

    legs = [l for l in [leg1, leg2, leg3, leg4] if l]

    if not legs:
        # Return available contract months
        return {"available_contracts": list(df.columns)}

    # Validate legs exist
    missing = [l for l in legs if l not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Contracts not found: {missing}. Available: {list(df.columns)[:20]}")

    # Compute structure value
    result_df = df[legs].dropna()

    if structure == "outright":
        result_df["value"] = result_df[legs[0]]
    elif structure == "spread" and len(legs) >= 2:
        result_df["value"] = result_df[legs[0]] - result_df[legs[1]]
    elif structure == "fly" and len(legs) >= 3:
        result_df["value"] = result_df[legs[0]] - 2 * result_df[legs[1]] + result_df[legs[2]]
    elif structure == "dfly" and len(legs) >= 4:
        result_df["value"] = result_df[legs[0]] - 3 * result_df[legs[1]] + 3 * result_df[legs[2]] - result_df[legs[3]]
    else:
        raise HTTPException(status_code=400, detail="Invalid structure or not enough legs")

    # Convert to bps for spreads/flies (multiply by 100)
    is_outright = structure == "outright"
    if not is_outright:
        result_df["value"] = result_df["value"] * 100

    # Get macro events to mark on chart
    events = db.execute(
        text("SELECT date, indicator FROM macro_events ORDER BY date ASC")
    ).fetchall()

    fomc = db.execute(
        text("SELECT date, decision FROM fomc_events ORDER BY date ASC")
    ).fetchall()

    event_marks = [{"date": e.date, "indicator": e.indicator} for e in events]
    event_marks += [{"date": f.date, "indicator": f"FOMC {f.decision}"} for f in fomc]

    data_out = [{"date": str(idx), "value": round(float(val), 4)}
                for idx, val in result_df["value"].items() if pd.notna(val)]

    return {
        "instrument": instrument.upper(),
        "structure": structure,
        "legs": legs,
        "is_outright": is_outright,
        "unit": "price" if is_outright else "bps",
        "data": data_out,
        "events": event_marks
    }


@router.get("/fomc-analysis")
def get_fomc_analysis(date: str, db: Session = Depends(get_db)):
    """
    AI analysis of FOMC decision tone and forward guidance.
    """
    from google import genai as google_genai
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

    event = db.execute(
        text("SELECT date, rate, prev_rate, change_bps, decision FROM fomc_events WHERE date = :date"),
        {"date": date}
    ).fetchone()

    if not event:
        raise HTTPException(status_code=404, detail="FOMC event not found")

    # Get SOFR curve around FOMC date
    sofr_rows = db.execute(
        text("""
            SELECT date, maturity, rate FROM sofr_curve
            WHERE date BETWEEN date(:date, '-7 days') AND date(:date, '+7 days')
            ORDER BY date ASC
        """),
        {"date": date}
    ).fetchall()

    curve_by_date = {}
    for r in sofr_rows:
        if r.date not in curve_by_date:
            curve_by_date[r.date] = {}
        curve_by_date[r.date][r.maturity] = round(r.rate, 4)

    dates = sorted(curve_by_date.keys())
    curve_before = curve_by_date.get(dates[0], {}) if dates else {}
    curve_after  = curve_by_date.get(dates[-1], {}) if dates else {}

    prompt = f"""You are a senior fixed income analyst specializing in Fed policy and short-term rate markets.

FOMC Meeting Details:
- Date: {event.date}
- Decision: {event.decision.upper()} — {abs(event.change_bps):.0f} bps
- New Fed Funds Target Rate: {event.rate}%
- Previous Rate: {event.prev_rate}%

SOFR curve before the meeting: {curve_before}
SOFR curve after the meeting: {curve_after}

Write a concise 3-4 paragraph analyst note covering:
1. What the Fed decided and whether the market was surprised (hawkish or dovish tone)
2. How the SOFR curve reacted — specific maturities, basis point moves, curve shape changes
3. What the decision implies for the next 2-3 FOMC meetings and the terminal rate
4. Key risks to the current rate path (inflation re-acceleration, labor market, geopolitics)

Write in professional fixed income style. Use basis points (bps) for rate changes. Be specific."""

    gemini_key = os.getenv("GEMINI_API_KEY")
    client_ai = google_genai.Client(api_key=gemini_key)
    response = client_ai.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt
    )

    return {
        "event": {
            "date": event.date,
            "decision": event.decision,
            "change_bps": event.change_bps,
            "rate": event.rate,
            "prev_rate": event.prev_rate
        },
        "curve_before": curve_before,
        "curve_after": curve_after,
        "analysis": response.text
    }