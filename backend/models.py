from sqlalchemy import Column, Integer, String, Float
from database import Base

class SofrCurve(Base):
    __tablename__ = "sofr_curve"

    id       = Column(Integer, primary_key=True, index=True)
    date     = Column(String, nullable=False)
    maturity = Column(String, nullable=False)
    rate     = Column(Float)


class FedFunds(Base):
    __tablename__ = "fed_funds"

    id   = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False, unique=True)
    rate = Column(Float)


class MacroEvent(Base):
    __tablename__ = "macro_events"

    id         = Column(Integer, primary_key=True, index=True)
    date       = Column(String, nullable=False)
    indicator  = Column(String, nullable=False)
    value      = Column(Float)
    mom_change = Column(Float)
    pct_change = Column(Float)