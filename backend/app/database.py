from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./whelsplit.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_person_debts_paid_column()


def _ensure_person_debts_paid_column() -> None:
    with engine.begin() as connection:
        table_info = connection.exec_driver_sql("PRAGMA table_info(person)").fetchall()
        columns = {row[1] for row in table_info}
        if "debts_paid" not in columns:
            connection.exec_driver_sql(
                "ALTER TABLE person ADD COLUMN debts_paid BOOLEAN NOT NULL DEFAULT 0"
            )


def get_session():
    with Session(engine) as session:
        yield session
