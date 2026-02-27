from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router

app = FastAPI(
    title="Macro AI — SOFR & Fed Funds Dashboard",
    description="API for visualizing SOFR curve movements around macro events",
    version="1.0.0"
)

# This allows the React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Welcome to Macro AI API. Visit /docs for all endpoints."}
