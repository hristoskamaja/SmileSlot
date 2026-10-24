from app.config import Settings


def make_settings(**values) -> Settings:
    # _env_file=None: ignore backend/.env, so the tests only see the values given here.
    return Settings(_env_file=None, **values)


def test_postgresql_url_gets_the_psycopg_driver():
    settings = make_settings(database_url="postgresql://user:pw@host:5432/db")
    assert settings.database_url == "postgresql+psycopg://user:pw@host:5432/db"


def test_postgres_url_gets_the_psycopg_driver():
    settings = make_settings(database_url="postgres://user:pw@host/db")
    assert settings.database_url == "postgresql+psycopg://user:pw@host/db"


def test_psycopg_url_stays_the_same():
    url = "postgresql+psycopg://user:pw@localhost:5433/db"
    assert make_settings(database_url=url).database_url == url


def test_rest_of_the_url_is_not_changed():
    settings = make_settings(database_url="postgres://user:pw@host.oregon-postgres.render.com/db?sslmode=require")
    assert settings.database_url == "postgresql+psycopg://user:pw@host.oregon-postgres.render.com/db?sslmode=require"


def test_cors_origins_are_a_comma_separated_list():
    settings = make_settings(
        database_url="postgresql://x/db",
        cors_origins="https://smileslot.onrender.com, http://localhost:5173,",
    )
    assert settings.cors_origin_list == ["https://smileslot.onrender.com", "http://localhost:5173"]
