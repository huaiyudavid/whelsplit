from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routes.balances import router as balances_router
from app.routes.currency import router as currency_router
from app.routes.expenses import router as expenses_router
from app.routes.people import router as people_router

app = FastAPI(title="whelsplit API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(people_router)
app.include_router(expenses_router)
app.include_router(balances_router)
app.include_router(currency_router)
