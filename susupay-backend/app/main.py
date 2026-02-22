from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, clients, collectors, payouts, reports, transactions, ussd

app = FastAPI(title="SusuPay API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(collectors.router)
app.include_router(clients.router)
app.include_router(transactions.router)
app.include_router(payouts.router)
app.include_router(reports.router)
app.include_router(ussd.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
