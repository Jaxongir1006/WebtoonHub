"""Prepare a Git-ignored Render env file without printing credentials.

Run using backend/.venv/Scripts/python.exe deploy/free/prepare_render_env.py.
Copy generated values into Render's environment editor, never into chat.
"""
from pathlib import Path
from dotenv import dotenv_values
from sqlalchemy.engine import make_url


def main():
    directory = Path(__file__).resolve().parent
    source = dotenv_values(directory / '.env.local', interpolate=False)
    required = ['SUPABASE_DATABASE_CONNECTION', 'SUPABASE_DATABASE_PASSWORD', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']
    if any(not source.get(name) for name in required):
        raise SystemExit('Fill every required Supabase value in deploy/free/.env.local first')
    try:
        url = make_url(source['SUPABASE_DATABASE_CONNECTION'])
        if not (url.host and url.host.endswith('.pooler.supabase.com') and url.port == 5432):
            raise ValueError()
        # The password is provided separately and SQLAlchemy percent-encodes it.
        query = {key: value for key, value in url.query.items() if key not in {'ssl', 'sslmode'}}
        database_url = url.set(drivername='postgresql+asyncpg', password=source['SUPABASE_DATABASE_PASSWORD'],
                               query=query).render_as_string(hide_password=False)
    except Exception:
        raise SystemExit('Use the Session pooler URI on port 5432; keep the password separate') from None
    values = {
        'DATABASE_URL': database_url,
        'SUPABASE_URL': source['SUPABASE_URL'],
        'SUPABASE_SECRET_KEY': source['SUPABASE_SECRET_KEY'],
        # Safe placeholders until actual Vercel domains are known. Replace in
        # Render before testing browser flows or sending account emails.
        'ALLOWED_ORIGINS': source.get('ALLOWED_ORIGINS') or '["https://example.invalid"]',
        'FRONTEND_URL': source.get('FRONTEND_URL') or 'https://example.invalid',
    }
    output = directory / '.env.render.local'
    if any('\n' in value or '\r' in value for value in values.values()):
        raise SystemExit('Deployment values must not contain line breaks')
    output.write_text('\n'.join(f'{key}={value}' for key, value in values.items()) + '\n', encoding='utf-8')
    print('Prepared deploy/free/.env.render.local. No credentials were printed.')
    print('Replace the frontend URL and allowed origins with your actual Vercel URLs when available.')


if __name__ == '__main__':
    main()
