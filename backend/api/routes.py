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
