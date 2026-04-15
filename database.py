import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path("scores.db")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS scores (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    class_year  TEXT NOT NULL,
    email       TEXT,
    daily_co2e  REAL NOT NULL,
    tier        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(CREATE_TABLE_SQL)
        conn.commit()


def insert_score(name: str, class_year: str, email: str | None, daily_co2e: float, tier: str) -> int:
    sql = """
        INSERT INTO scores (name, class_year, email, daily_co2e, tier, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    with get_connection() as conn:
        cursor = conn.execute(sql, (name, class_year, email, daily_co2e, tier, datetime.utcnow()))
        conn.commit()
        return cursor.lastrowid


def get_rank_for_score(daily_co2e: float) -> int:
    sql = "SELECT COUNT(*) FROM scores WHERE daily_co2e < ?"
    with get_connection() as conn:
        row = conn.execute(sql, (daily_co2e,)).fetchone()
        return row[0] + 1


def get_all_scores() -> list[dict]:
    sql = """
        SELECT id, name, class_year, email, daily_co2e, tier, created_at,
               RANK() OVER (ORDER BY daily_co2e ASC) AS rank
        FROM scores
        ORDER BY daily_co2e ASC
    """
    with get_connection() as conn:
        rows = conn.execute(sql).fetchall()
        return [dict(row) for row in rows]
