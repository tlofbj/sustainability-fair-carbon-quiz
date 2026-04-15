from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import yaml
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

import database


def load_yaml(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


QUESTIONS = load_yaml("questions.yaml")["questions"]
LOCAL_DATA = load_yaml("local_data.yaml")


def compute_tier(daily_co2e: float) -> str:
    # Thresholds widened: flight questions substantially raise typical scores
    # < 5.0  → well below 1.5°C fair-share budget (~6.8 kg/day)
    # 5–10   → between 1.5°C and 2°C budgets
    # 10–20  → above 2°C budget, near / above global avg (12.9 kg/day)
    # ≥ 20   → significantly above global average
    if daily_co2e < 5.0:
        return "Eco Warrior"
    elif daily_co2e < 10.0:
        return "Green Thinker"
    elif daily_co2e < 20.0:
        return "Carbon Aware"
    else:
        return "Heavy Footprint"


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(title="Carbon Footprint Quiz", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/", response_class=HTMLResponse)
async def quiz_page(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "questions": QUESTIONS,
        "local_data": LOCAL_DATA,
        "question_count": len(QUESTIONS),
    })


@app.get("/scoreboard", response_class=HTMLResponse)
async def scoreboard_page(request: Request):
    return templates.TemplateResponse("scoreboard.html", {"request": request})


class SubmitPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    class_year: str = Field(..., pattern=r"^(\d{2}|faculty|admin|other)$")
    email: Optional[str] = None
    answers: list[float] = Field(..., min_length=1)


@app.post("/submit")
async def submit_quiz(payload: SubmitPayload):
    daily_co2e = round(sum(payload.answers), 3)
    tier = compute_tier(daily_co2e)
    database.insert_score(
        name=payload.name,
        class_year=payload.class_year,
        email=payload.email or None,
        daily_co2e=daily_co2e,
        tier=tier,
    )
    rank = database.get_rank_for_score(daily_co2e)
    return JSONResponse({
        "daily_co2e": daily_co2e,
        "tier": tier,
        "rank": rank,
    })


@app.get("/api/scores")
async def api_scores():
    scores = database.get_all_scores()
    for s in scores:
        del s["email"]
    return JSONResponse(scores)


@app.get("/api/local")
async def api_local():
    return JSONResponse(LOCAL_DATA)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
