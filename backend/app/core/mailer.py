import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import aiosmtplib
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to_email: str,
    subject: str,
    html_content: str
) -> bool:
    """Send email asynchronously using SMTP (Mailpit or real SMTP)"""
    message = MIMEMultipart("alternative")
    message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    message["To"] = to_email
    message["Subject"] = subject

    html_part = MIMEText(html_content, "html", "utf-8")
    message.attach(html_part)

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER if settings.SMTP_USER else None,
            password=settings.SMTP_PASSWORD if settings.SMTP_PASSWORD else None,
            use_tls=settings.SMTP_TLS
        )
        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


async def send_welcome_email(to_email: str, username: str) -> bool:
    """Send welcome email upon successful user registration"""
    subject = "⚡ WebtoonHub platformasiga xush kelibsiz!"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; }}
            .title {{ color: #111827; font-size: 24px; font-weight: 800; }}
            .badge {{ display: inline-block; background: #fef3c7; color: #b45309; padding: 6px 12px; border-radius: 9999px; font-weight: 700; margin: 16px 0; }}
            .content {{ color: #4b5563; font-size: 16px; line-height: 1.6; }}
            .footer {{ text-align: center; color: #9ca3af; font-size: 13px; margin-top: 32px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">⚡ WebtoonHub</div>
            </div>
            <div class="content">
                <p>Salom, <strong>{username}</strong>!</p>
                <p>WebtoonHub platformasiga xush kelibsiz! O'zbek tilidagi eng sara manhva va webtoonlarni qulay mutolaa qilishingiz mumkin.</p>
                <div style="text-align: center;">
                    <div class="badge">🎁 Sizga +50 ⚡ Chaqmoq bonusi berildi!</div>
                </div>
                <p>To'plangan Chaqmoqlaringizni profil sozlamalarida va Do'konda yangi avatar ramkalari hamda fonlarni xarid qilish uchun sarflashingiz mumkin.</p>
                <p>Maroqli mutolaa tilaymiz!</p>
            </div>
            <div class="footer">
                &copy; 2026 WebtoonHub — KIUT PBL3 Loyihasi.
            </div>
        </div>
    </body>
    </html>
    """
    return await send_email(to_email, subject, html)
