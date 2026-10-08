import math
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from slugify import slugify
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, load_only

from app.core.transactions import serialize_user, entity_lock
from app.core.config import settings
from app.core.redis import CacheService
from app.core.storage import StorageService
from app.core.media_cleanup import delete_unreferenced_media
from app.modules.rewards.models import ReadReward
from app.modules.staff.dependencies import owns_content_only
from app.modules.webtoons.models import Chapter, ChapterImage, ChapterUploadBatch, Genre, Webtoon
from app.modules.webtoons.schemas import (
    ChapterImageItem,
    ChapterItemSimple,
    ChapterReaderResponse,
    GenreItem,
    LatestChapterInfo,
    WebtoonCatalogResponse,
    WebtoonDetailResponse,
    WebtoonSummaryItem
)


class WebtoonService:
    @staticmethod
    async def list_genres(db: AsyncSession) -> List[GenreItem]:
        cache_key = "genres:all"
        cached = await CacheService.get(cache_key)
        if cached:
            return [GenreItem(**item) for item in cached]

        stmt = select(Genre).order_by(Genre.name.asc())
        result = await db.execute(stmt)
        genres = result.scalars().all()
        from app.modules.webtoons.models import WebtoonGenre
        counts = dict((await db.execute(select(WebtoonGenre.genre_id, func.count(WebtoonGenre.webtoon_id)).group_by(WebtoonGenre.genre_id))).all())
        data = [GenreItem(id=g.id, name=g.name, slug=g.slug, webtoon_count=counts.get(g.id, 0)) for g in genres]
        await CacheService.set(cache_key, [d.model_dump() for d in data], expire_seconds=3600)
        return data

    @staticmethod
    async def list_catalog(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        type_filter: Optional[str] = None,
        genre_slug: Optional[str] = None,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        sort: str = "popular",
        owner_id: Optional[int] = None,
        include_unpublished: bool = False
    ) -> WebtoonCatalogResponse:
        cache_key = f"webtoons:catalog:v3:p{page}:l{limit}:t{type_filter}:g{genre_slug}:s{status_filter}:q{search_query}:sort{sort}:owner{owner_id}:staff{include_unpublished}"
        cached = await CacheService.get(cache_key)
        if cached:
            return WebtoonCatalogResponse(**cached)

        # Base query
        query = select(Webtoon).options(
            selectinload(Webtoon.genres),
            selectinload(Webtoon.chapters).load_only(Chapter.id, Chapter.chapter_number, Chapter.status, Chapter.created_at, Chapter.published_at, Chapter.title, Chapter.reward_coins)
        )

        if owner_id is not None:
            query = query.where(Webtoon.uploader_staff_id == owner_id)
        if type_filter:
            query = query.where(Webtoon.type == type_filter)

        if genre_slug:
            query = query.join(Webtoon.genres).where(Genre.slug == genre_slug)

        if status_filter:
            query = query.where(Webtoon.status == status_filter)

        if search_query:
            search = f"%{search_query.strip()}%"
            query = query.where((Webtoon.title.ilike(search)) | (Webtoon.author_name.ilike(search)))

        # Total count query
        count_stmt = select(func.count(func.distinct(Webtoon.id)))
        if owner_id is not None:
            count_stmt = count_stmt.where(Webtoon.uploader_staff_id == owner_id)
        if type_filter:
            count_stmt = count_stmt.where(Webtoon.type == type_filter)
        if genre_slug:
            count_stmt = count_stmt.join(Webtoon.genres).where(Genre.slug == genre_slug)
        if status_filter:
            count_stmt = count_stmt.where(Webtoon.status == status_filter)
        if search_query:
            count_stmt = count_stmt.where((Webtoon.title.ilike(search)) | (Webtoon.author_name.ilike(search)))

        total_res = await db.execute(count_stmt)
        total = total_res.scalar() or 0

        # Pagination
        offset = (page - 1) * limit
        if sort in {'latest', 'updated'}:
            latest_date = select(func.max(Chapter.published_at)).where(Chapter.webtoon_id == Webtoon.id, Chapter.status == 'published').correlate(Webtoon).scalar_subquery()
            query = query.order_by(func.coalesce(latest_date, Webtoon.created_at).desc(), Webtoon.id.desc())
        elif sort == 'newest':
            query = query.order_by(Webtoon.created_at.desc(), Webtoon.id.desc())
        elif sort == 'title':
            query = query.order_by(Webtoon.title.asc(), Webtoon.id.asc())
        else:
            query = query.order_by(Webtoon.view_count.desc(), Webtoon.id.desc())
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        webtoons = result.scalars().unique().all()

        items = []
        for w in webtoons:
            # find latest published chapter
            pub_chapters = [c for c in w.chapters if c.status == "published"]
            latest_ch = None
            first_ch = None
            if pub_chapters:
                sorted_chs = sorted(pub_chapters, key=lambda c: c.chapter_number, reverse=True)
                latest = sorted_chs[0]
                first = sorted_chs[-1]
                latest_ch = LatestChapterInfo(
                    id=latest.id,
                    chapter_number=float(latest.chapter_number),
                    created_at=latest.created_at, published_at=latest.published_at
                )
                first_ch = LatestChapterInfo(
                    id=first.id,
                    chapter_number=float(first.chapter_number),
                    created_at=first.created_at, published_at=first.published_at
                )

            items.append(
                WebtoonSummaryItem(
                    id=w.id,
                    title=w.title,
                    slug=w.slug,
                    type=w.type or "manhwa",
                    description=w.description,
                    cover_image_url=w.cover_image_url,
                    author_name=w.author_name,
                    status=w.status,
                    view_count=w.view_count,
                    genres=[g.name for g in w.genres],
                    genre_ids=[g.id for g in w.genres],
                    chapter_count=len(w.chapters) if include_unpublished else len(pub_chapters),
                    latest_chapter=latest_ch,
                    first_chapter=first_ch
                )
            )

        pages = math.ceil(total / limit) if limit > 0 else 1
        response = WebtoonCatalogResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=pages
        )

        await CacheService.set(cache_key, response.model_dump(mode="json"), expire_seconds=300)
        return response

    @staticmethod
    async def get_webtoon_detail(
        db: AsyncSession,
        id_or_slug: str,
        user_id: Optional[int] = None,
        count_view: bool = True
    ) -> WebtoonDetailResponse:
        # Determine query by ID or slug
        if id_or_slug.isdigit():
            cond = (Webtoon.id == int(id_or_slug))
        else:
            cond = (Webtoon.slug == id_or_slug)

        stmt = (
            select(Webtoon)
            .options(
                selectinload(Webtoon.genres),
                selectinload(Webtoon.chapters).load_only(Chapter.id, Chapter.chapter_number, Chapter.status, Chapter.created_at, Chapter.published_at, Chapter.title, Chapter.reward_coins)
            )
            .where(cond)
        )
        result = await db.execute(stmt)
        webtoon = result.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        # Increment view count
        if count_view:
            await db.execute(update(Webtoon).where(Webtoon.id == webtoon.id).values(view_count=Webtoon.view_count + 1))
            await db.commit()

        # Check claimed chapters if user is authenticated
        claimed_chapter_ids = set()
        if user_id:
            ch_ids = [c.id for c in webtoon.chapters]
            if ch_ids:
                r_stmt = select(ReadReward.chapter_id).where(
                    ReadReward.user_id == user_id,
                    ReadReward.chapter_id.in_(ch_ids)
                )
                r_res = await db.execute(r_stmt)
                claimed_chapter_ids = set(r_res.scalars().all())

        # Only list published chapters for public reader
        pub_chapters = [c for c in webtoon.chapters if c.status == "published"]
        sorted_pub = sorted(pub_chapters, key=lambda c: c.chapter_number)

        chapter_items = [
            ChapterItemSimple(
                id=c.id,
                chapter_number=float(c.chapter_number),
                title=c.title,
                reward_coins=c.reward_coins,
                is_claimed=(c.id in claimed_chapter_ids),
                created_at=c.created_at, published_at=c.published_at
            )
            for c in sorted_pub
        ]

        return WebtoonDetailResponse(
            id=webtoon.id,
            title=webtoon.title,
            slug=webtoon.slug,
            type=webtoon.type or "manhwa",
            description=webtoon.description,
            cover_image_url=webtoon.cover_image_url,
            author_name=webtoon.author_name,
            status=webtoon.status,
            view_count=webtoon.view_count,
            genres=[g.name for g in webtoon.genres],
            genre_ids=[g.id for g in webtoon.genres],
            chapter_count=len(pub_chapters),
            chapters=chapter_items
        )

    @staticmethod
    @serialize_user
    async def read_chapter(
        db: AsyncSession,
        chapter_id: int,
        user_id: Optional[int] = None,
        is_staff: bool = False
    ) -> ChapterReaderResponse:
        stmt = (
            select(Chapter)
            .options(
                selectinload(Chapter.webtoon),
                selectinload(Chapter.images)
            )
            .where(Chapter.id == chapter_id)
        )
        result = await db.execute(stmt)
        chapter = result.scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        if not is_staff and chapter.status != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ushbu bob hali moderatorlar tomonidan tekshirilmoqda"
            )

        # Check if reward is claimed
        is_claimed = False
        if user_id:
            r_stmt = select(ReadReward).where(
                ReadReward.user_id == user_id,
                ReadReward.chapter_id == chapter_id
            )
            r_res = await db.execute(r_stmt)
            if r_res.scalar_one_or_none():
                is_claimed = True

        # Indexed neighbors avoid loading the complete chapter history on each page.
        prev_id = await db.scalar(select(Chapter.id).where(Chapter.webtoon_id == chapter.webtoon_id, Chapter.status == 'published', Chapter.chapter_number < chapter.chapter_number)
                                  .order_by(Chapter.chapter_number.desc()).limit(1))
        next_id = await db.scalar(select(Chapter.id).where(Chapter.webtoon_id == chapter.webtoon_id, Chapter.status == 'published', Chapter.chapter_number > chapter.chapter_number)
                                  .order_by(Chapter.chapter_number.asc()).limit(1))

        reading_progress = None
        if user_id and not is_staff:
            from app.modules.library.progress import begin_reading, progress_data
            row = await begin_reading(db, user_id, chapter)
            await db.commit()
            reading_progress = progress_data(row)
        sorted_images = sorted(chapter.images, key=lambda img: img.order_index)
        changed = False
        for img in sorted_images:
            if not img.width or not img.height:
                dims = await StorageService.image_dimensions_async(img.image_url)
                if dims:
                    img.width, img.height = dims
                    changed = True
        if changed:
            await db.commit()

        return ChapterReaderResponse(
            id=chapter.id,
            webtoon_id=chapter.webtoon_id,
            webtoon_title=chapter.webtoon.title,
            webtoon_type=chapter.webtoon.type or "manhwa",
            chapter_number=float(chapter.chapter_number),
            title=chapter.title,
            reward_coins=chapter.reward_coins,
            is_reward_claimed=is_claimed,
            content_text=chapter.content_text,
            images=[ChapterImageItem(id=img.id, image_url=StorageService.optimized_image_url(img.image_url), order_index=img.order_index, width=img.width, height=img.height) for img in sorted_images],
            reading_progress=reading_progress,
            reward_eligible_at=reading_progress["reward_eligible_at"] if reading_progress else None,
            prev_chapter_id=prev_id,
            next_chapter_id=next_id
        )

    @staticmethod
    async def create_webtoon(
        db: AsyncSession,
        title: str,
        description: Optional[str],
        author_name: Optional[str],
        status_val: str,
        genre_ids: List[int],
        cover_file: UploadFile,
        staff_id: int,
        type_val: str = "manhwa"
    ) -> Webtoon:
        WebtoonService.validate_work(title, type_val, status_val)
        if genre_ids:
            existing_ids = set((await db.execute(select(Genre.id).where(Genre.id.in_(genre_ids)))).scalars())
            if existing_ids != set(genre_ids):
                raise HTTPException(422, "One or more selected genres no longer exist")
        # Check slug uniqueness
        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while True:
            s_stmt = select(Webtoon).where(Webtoon.slug == slug)
            s_res = await db.execute(s_stmt)
            if not s_res.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Upload cover image to MinIO
        file_ext = cover_file.filename.split(".")[-1].lower() if cover_file.filename else "webp"
        object_name = f"{slug}_{uuid.uuid4().hex[:8]}.{file_ext}"
        content = await cover_file.read(20 * 1024 * 1024 + 1)
        cover_url = await StorageService.upload_file_async(
            bucket_name=settings.MINIO_BUCKET_COVERS,
            object_name=object_name,
            data=content,
            content_type=cover_file.content_type or "image/webp"
        )

        # Fetch genres
        genres = []
        if genre_ids:
            clean_ids = [genre_ids] if isinstance(genre_ids, int) else list(genre_ids)
            g_stmt = select(Genre).where(Genre.id.in_(clean_ids))
            g_res = await db.execute(g_stmt)
            genres = list(g_res.scalars().all())

        new_webtoon = Webtoon(
            title=title,
            slug=slug,
            type=type_val,
            description=description,
            author_name=author_name,
            status=status_val,
            cover_image_url=cover_url,
            uploader_staff_id=staff_id,
            genres=genres
        )
        db.add(new_webtoon)
        await db.commit()
        await db.refresh(new_webtoon)

        await CacheService.delete("genres:all")
        # Invalidate catalog cache
        await CacheService.delete_pattern("webtoons:catalog:*")
        return new_webtoon

    @staticmethod
    async def upload_chapter(
        db: AsyncSession,
        webtoon_id: int,
        chapter_number: float,
        title: Optional[str],
        content_text: Optional[str] = None,
        images: Optional[List[UploadFile]] = None,
        reward_coins: Optional[int] = None
    ) -> Chapter:
        if not math.isfinite(chapter_number) or chapter_number <= 0:
            raise HTTPException(422, "Chapter number must be positive and finite")
        # Check webtoon exists
        w_stmt = select(Webtoon).where(Webtoon.id == webtoon_id)
        w_res = await db.execute(w_stmt)
        webtoon = w_res.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa/Manga/Novel topilmadi")

        if webtoon.type == "novel":
            if not content_text or not content_text.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Novel bobida matn kiritilishi shart")
        else:
            if not images or len(images) == 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bob rasmlari yuklanishi shart")

        if images and sum(image.size or 0 for image in images) > 50*1024*1024:
            raise HTTPException(413, "Chapter image request must be at most 50 MB")
        if content_text and len(content_text) > 2000000:
            raise HTTPException(413, "Chapter text must be at most 2 million characters")
        if images and len(images) > 100:
            raise HTTPException(422, "Upload at most 100 chapter pages")
        # Check duplicate chapter number
        dup_stmt = select(Chapter).where(
            Chapter.webtoon_id == webtoon_id,
            Chapter.chapter_number == chapter_number
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ushbu asarda {chapter_number} raqamli bob allaqachon mavjud"
            )

        new_chapter = Chapter(
            webtoon_id=webtoon_id,
            chapter_number=chapter_number,
            title=title,
            content_text=content_text.strip() if content_text else None,
            status="pending",
            reward_coins=reward_coins if reward_coins is not None else await __import__("app.core.economy", fromlist=["economy_value"]).economy_value(db, "chapter_read_reward")
        )
        db.add(new_chapter)
        await db.flush()

        # Upload images and link (if provided)
        if images:
            for idx, img_file in enumerate(images, start=1):
                if not img_file.filename:
                    continue
                file_ext = img_file.filename.split(".")[-1].lower() if img_file.filename else "webp"
                object_name = f"{webtoon_id}/{new_chapter.id}/{idx:03d}_{uuid.uuid4().hex[:6]}.{file_ext}"
                content = await img_file.read(20 * 1024 * 1024 + 1)
                img_url = await StorageService.upload_file_async(
                    bucket_name=settings.MINIO_BUCKET_CHAPTERS,
                    object_name=object_name,
                    data=content,
                    content_type=img_file.content_type or "image/webp"
                )
                dimensions = await StorageService.image_dimensions_async(img_url)
                ch_img = ChapterImage(
                    chapter_id=new_chapter.id,
                    image_url=img_url,
                    order_index=idx, width=dimensions[0] if dimensions else None, height=dimensions[1] if dimensions else None
                )
                db.add(ch_img)

        await db.commit()
        await db.refresh(new_chapter)
        return new_chapter

    @staticmethod
    async def moderate_chapter(
        db: AsyncSession,
        chapter_id: int,
        new_status: str,
        feedback: Optional[str] = None
    ) -> None:
        stmt = select(Chapter).options(selectinload(Chapter.webtoon), selectinload(Chapter.images)).where(Chapter.id == chapter_id).with_for_update()
        result = await db.execute(stmt)
        chapter = result.scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        WebtoonService.validate_chapter_content(chapter.webtoon.type, chapter.content_text, len(chapter.images), new_status)
        if new_status == 'published' and chapter.status != 'published':
            chapter.published_at = datetime.now(timezone.utc)
        chapter.status = new_status
        chapter.moderation_feedback = feedback
        await db.commit()

        # Invalidate cache
        await CacheService.delete_pattern("webtoons:catalog:*")

    @staticmethod
    async def list_pending_chapters(db: AsyncSession):
        from app.modules.webtoons.schemas import PendingChapterItem
        stmt = (
            select(Chapter)
            .options(
                selectinload(Chapter.webtoon),
                selectinload(Chapter.images)
            )
            .where(Chapter.status == "pending")
            .order_by(Chapter.created_at.asc())
        )
        res = await db.execute(stmt)
        chapters = res.scalars().all()
        return [
            PendingChapterItem(
                id=c.id,
                webtoon_id=c.webtoon_id,
                webtoon_title=c.webtoon.title if c.webtoon else "Noma'lum",
                chapter_number=float(c.chapter_number),
                title=c.title,
                status=c.status,
                content_text=c.content_text,
                images_count=len(c.images),
                created_at=c.created_at
            )
            for c in chapters
        ]

    @staticmethod
    async def update_webtoon(
        db: AsyncSession,
        webtoon_id: int,
        title: Optional[str] = None,
        type_val: Optional[str] = None,
        description: Optional[str] = None,
        author_name: Optional[str] = None,
        status_val: Optional[str] = None,
        genre_ids: Optional[List[int]] = None,
        cover_file: Optional[UploadFile] = None
    ) -> Webtoon:
        stmt = select(Webtoon).options(selectinload(Webtoon.genres)).where(Webtoon.id == webtoon_id)
        res = await db.execute(stmt)
        webtoon = res.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        if type_val and type_val != webtoon.type and await db.scalar(select(Chapter.id).where(Chapter.webtoon_id == webtoon.id).limit(1)):
            raise HTTPException(409, "Work format cannot change after chapter content exists")
        if genre_ids is not None:
            existing_ids = set((await db.execute(select(Genre.id).where(Genre.id.in_(genre_ids)))).scalars())
            if existing_ids != set(genre_ids):
                raise HTTPException(422, "One or more selected genres no longer exist")
        WebtoonService.validate_work(title or webtoon.title, type_val or webtoon.type, status_val or webtoon.status)
        if title is not None:
            webtoon.title = title
        if type_val is not None:
            webtoon.type = type_val
        if description is not None:
            webtoon.description = description
        if author_name is not None:
            webtoon.author_name = author_name
        if status_val is not None:
            webtoon.status = status_val

        old_cover = webtoon.cover_image_url
        if cover_file is not None and cover_file.filename:
            file_ext = cover_file.filename.split(".")[-1].lower()
            object_name = f"{webtoon.slug}_{uuid.uuid4().hex[:8]}.{file_ext}"
            content = await cover_file.read(20 * 1024 * 1024 + 1)
            cover_url = await StorageService.upload_file_async(
                bucket_name=settings.MINIO_BUCKET_COVERS,
                object_name=object_name,
                data=content,
                content_type=cover_file.content_type or "image/webp"
            )
            webtoon.cover_image_url = cover_url

        if genre_ids is not None:
            clean_ids = [genre_ids] if isinstance(genre_ids, int) else list(genre_ids)
            g_stmt = select(Genre).where(Genre.id.in_(clean_ids))
            g_res = await db.execute(g_stmt)
            webtoon.genres = list(g_res.scalars().all())

        await db.commit()
        await db.refresh(webtoon)
        if old_cover != webtoon.cover_image_url:
            await delete_unreferenced_media(db, old_cover)
        await CacheService.delete("genres:all")
        await CacheService.delete_pattern("webtoons:catalog:*")
        return webtoon

    @staticmethod
    async def delete_webtoon(db: AsyncSession, webtoon_id: int) -> None:
        stmt = select(Webtoon).options(selectinload(Webtoon.chapters).selectinload(Chapter.images)).where(Webtoon.id == webtoon_id)
        res = await db.execute(stmt)
        webtoon = res.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        urls = [webtoon.cover_image_url] + [img.image_url for chapter in webtoon.chapters for img in chapter.images]
        await db.delete(webtoon)
        await db.commit()
        for url in urls:
            await delete_unreferenced_media(db, url)
        await CacheService.delete("genres:all")
        await CacheService.delete_pattern("webtoons:catalog:*")

    @staticmethod
    async def create_genre(db: AsyncSession, name: str, slug: Optional[str] = None) -> Genre:
        from slugify import slugify
        clean_name = name.strip()
        final_slug = slug.strip() if slug and slug.strip() else slugify(clean_name)

        # Check unique
        stmt = select(Genre).where((Genre.name == clean_name) | (Genre.slug == final_slug))
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bunday nom yoki slug bilan janr mavjud")

        genre = Genre(name=clean_name, slug=final_slug)
        db.add(genre)
        await db.commit()
        await db.refresh(genre)
        await CacheService.delete("genres:all")
        await CacheService.delete_pattern("webtoons:catalog:*")
        return genre

    @staticmethod
    async def update_genre(db: AsyncSession, genre_id: int, name: Optional[str] = None, slug: Optional[str] = None) -> Genre:
        from slugify import slugify
        stmt = select(Genre).where(Genre.id == genre_id)
        genre = (await db.execute(stmt)).scalar_one_or_none()
        if not genre:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Janr topilmadi")

        if name is not None and name.strip():
            genre.name = name.strip()
        if slug is not None and slug.strip():
            target_slug = slug.strip()
            # check uniqueness
            s_stmt = select(Genre).where(Genre.slug == target_slug, Genre.id != genre_id)
            if (await db.execute(s_stmt)).scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ushbu slug band")
            genre.slug = target_slug

        await db.commit()
        await db.refresh(genre)
        await CacheService.delete("genres:all")
        await CacheService.delete_pattern("webtoons:catalog:*")
        return genre

    @staticmethod
    async def delete_genre(db: AsyncSession, genre_id: int) -> None:
        stmt = select(Genre).where(Genre.id == genre_id)
        genre = (await db.execute(stmt)).scalar_one_or_none()
        if not genre:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Janr topilmadi")

        await db.delete(genre)
        await db.commit()
        await CacheService.delete("genres:all")
        await CacheService.delete_pattern("webtoons:catalog:*")

    @staticmethod
    async def list_webtoon_chapters_staff(db: AsyncSession, webtoon_id: int, status_filter: Optional[str] = None):
        from app.modules.webtoons.schemas import StaffChapterItem
        w_stmt = select(Webtoon).where(Webtoon.id == webtoon_id)
        webtoon = (await db.execute(w_stmt)).scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        query = select(Chapter).options(selectinload(Chapter.images)).where(Chapter.webtoon_id == webtoon_id)
        if status_filter:
            query = query.where(Chapter.status == status_filter)
        query = query.order_by(Chapter.chapter_number.desc())

        res = await db.execute(query)
        chapters = res.scalars().all()

        return [
            StaffChapterItem(
                id=c.id,
                webtoon_id=c.webtoon_id,
                chapter_number=c.chapter_number,
                title=c.title,
                reward_coins=c.reward_coins,
                status=c.status,
                content_text=c.content_text,
                images_count=len(c.images),
                created_at=c.created_at
            )
            for c in chapters
        ]

    @staticmethod
    async def apply_chapter_update(db, chapter, data, page_count, can_approve=False, pages_changed=False):
        previous_status = chapter.status
        changed = pages_changed or any(getattr(chapter, field) != getattr(data, field) for field in
            ['chapter_number', 'title', 'content_text', 'reward_coins'] if getattr(data, field) is not None)
        if data.image_ids is not None:
            changed = changed or data.image_ids != [image.id for image in chapter.images]
        if data.status in {'published', 'rejected'} and not can_approve:
            raise HTTPException(403, 'Publishing and rejecting chapters requires chapters:approve')
        if data.chapter_number is not None:
            duplicate = await db.scalar(select(Chapter.id).where(Chapter.webtoon_id == chapter.webtoon_id,
                        Chapter.chapter_number == data.chapter_number, Chapter.id != chapter.id).limit(1))
            if duplicate:
                raise HTTPException(409, 'This chapter number already exists')
            chapter.chapter_number = data.chapter_number
        if data.title is not None:
            chapter.title = data.title
        if hasattr(data, "content_text") and data.content_text is not None:
            chapter.content_text = data.content_text
        if data.reward_coins is not None:
            chapter.reward_coins = data.reward_coins
        if data.status is not None:
            chapter.status = data.status
        if previous_status == 'published' and changed and not can_approve:
            chapter.status = 'pending'
        WebtoonService.validate_chapter_content(chapter.webtoon.type, chapter.content_text, page_count, chapter.status)
        if chapter.status == 'published' and previous_status != 'published':
            chapter.published_at = datetime.now(timezone.utc)
        chapter._status_changed_to_pending = previous_status == 'published' and chapter.status == 'pending'

    @staticmethod
    def validate_chapter_content(work_type, content_text, page_count, chapter_status):
        if chapter_status not in {'pending', 'published'}:
            return
        if work_type == 'novel' and not (content_text or '').strip():
            raise HTTPException(422, 'A submitted novel chapter requires nonblank text')
        if work_type != 'novel' and page_count < 1:
            raise HTTPException(422, 'A submitted comic chapter requires at least one page')

    @staticmethod
    async def update_chapter(db: AsyncSession, chapter_id: int, data, can_approve=False) -> Chapter:
        async with entity_lock('chapter', chapter_id):
            stmt = select(Chapter).options(selectinload(Chapter.webtoon), selectinload(Chapter.images)).where(Chapter.id == chapter_id).with_for_update().execution_options(populate_existing=True)
            chapter = (await db.execute(stmt)).scalar_one_or_none()
            if not chapter:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")
            retained = [image.id for image in chapter.images] if data.image_ids is None else data.image_ids
            if len(retained) != len(set(retained)):
                raise HTTPException(422, 'Chapter pages must have distinct IDs')
            by_id = {img.id: img for img in chapter.images}
            if any(identifier not in by_id for identifier in retained):
                raise HTTPException(422, 'Page does not belong to this chapter')
            await WebtoonService.apply_chapter_update(db, chapter, data, len(retained), can_approve)
            removed_urls = []
            if data.image_ids is not None:
                for image in chapter.images:
                    if image.id not in retained:
                        removed_urls.append(image.image_url)
                        await db.delete(image)
                for index, identifier in enumerate(retained, 1):
                    by_id[identifier].order_index = index
            await db.commit()
            await db.refresh(chapter)

        for url in removed_urls:
            await delete_unreferenced_media(db, url)
        # Invalidate caches
        await CacheService.delete(f"chapters:{chapter_id}:reader")
        if chapter.webtoon:
            await CacheService.delete(f"webtoons:{chapter.webtoon.slug}")
        await CacheService.delete_pattern("webtoons:catalog:*")

        return chapter

    @staticmethod
    async def delete_chapter(db: AsyncSession, chapter_id: int) -> None:
        stmt = select(Chapter).options(selectinload(Chapter.webtoon), selectinload(Chapter.images)).where(Chapter.id == chapter_id)
        chapter = (await db.execute(stmt)).scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        webtoon_slug = chapter.webtoon.slug if chapter.webtoon else None

        urls = [img.image_url for img in chapter.images]
        await db.delete(chapter)
        await db.commit()
        for url in urls:
            await delete_unreferenced_media(db, url)

        await CacheService.delete(f"chapters:{chapter_id}:reader")
        if webtoon_slug:
            await CacheService.delete(f"webtoons:{webtoon_slug}")
        await CacheService.delete_pattern("webtoons:catalog:*")

    @staticmethod
    async def list_all_chapters_staff(
        db: AsyncSession,
        status_filter: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ):
        query = select(Chapter).options(
            selectinload(Chapter.webtoon),
            selectinload(Chapter.images)
        )
        if status_filter and status_filter != "all":
            query = query.where(Chapter.status == status_filter)
        query = query.order_by(Chapter.created_at.desc()).offset((page - 1) * limit).limit(limit)

        res = await db.execute(query)
        chapters = res.scalars().all()

        return [
            {
                "id": c.id,
                "webtoon_id": c.webtoon_id,
                "webtoon_title": c.webtoon.title if c.webtoon else "Noma'lum",
                "webtoon_cover": c.webtoon.cover_image_url if c.webtoon else None,
                "chapter_number": float(c.chapter_number),
                "title": c.title,
                "status": c.status,
                "images_count": len(c.images),
                "images": [img.image_url for img in sorted(c.images, key=lambda x: x.order_index)],
                "reward_coins": c.reward_coins,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in chapters
        ]



    @staticmethod
    def validate_work(title, type_val, status_val):
        if not title.strip() or len(title) > 255 or type_val not in {'manhwa', 'manga', 'novel'} or status_val not in {'ongoing', 'completed'}:
            raise HTTPException(422, 'Invalid title, work type or status')

    @staticmethod
    async def authorize_work(db, work_id, staff):
        work = await db.get(Webtoon, work_id)
        if work is None:
            raise HTTPException(404, 'Work not found')
        if owns_content_only(staff) and work.uploader_staff_id != staff.id:
            raise HTTPException(403, 'Creators may manage only their own works')
        return work

    @staticmethod
    async def authorize_chapter(db, chapter_id, staff):
        chapter = await db.get(Chapter, chapter_id)
        if chapter is None:
            raise HTTPException(404, 'Chapter not found')
        await WebtoonService.authorize_work(db, chapter.webtoon_id, staff)
        return chapter

    @staticmethod
    async def staff_detail(db, id_or_slug, staff):
        condition = Webtoon.id == int(id_or_slug) if id_or_slug.isdigit() else Webtoon.slug == id_or_slug
        work = (await db.execute(select(Webtoon).options(selectinload(Webtoon.genres), selectinload(Webtoon.chapters).selectinload(Chapter.images)).where(condition))).scalar_one_or_none()
        if work is None:
            raise HTTPException(404, 'Work not found')
        await WebtoonService.authorize_work(db, work.id, staff)
        return {key: getattr(work, key) for key in ['id','title','slug','type','description','cover_image_url','author_name','status','view_count']} | {
            'genres': [g.name for g in work.genres], 'genre_ids': [g.id for g in work.genres], 'chapter_count': len(work.chapters),
            'chapters': [{'id': c.id, 'webtoon_id': work.id, 'chapter_number': float(c.chapter_number), 'title': c.title, 'status': c.status,
                          'reward_coins': c.reward_coins, 'content_text': c.content_text, 'moderation_feedback': c.moderation_feedback,
                          'created_at': c.created_at, 'images_count': len(c.images),
                          'images': [{'id': image.id, 'image_url': image.image_url, 'order_index': image.order_index, 'width': image.width, 'height': image.height}
                                     for image in sorted(c.images, key=lambda image: image.order_index)]} for c in work.chapters]}

    @staticmethod
    async def append_images(db, chapter_id, images, staff_id, idempotency_key=None, retained_image_ids=None, chapter_update=None, can_approve=False):
        from app.modules.webtoons.schemas import ChapterUpdateRequest
        images = images or []
        async with entity_lock('chapter', chapter_id):
            chapter = (await db.execute(select(Chapter).options(selectinload(Chapter.images), selectinload(Chapter.webtoon)).where(Chapter.id == chapter_id)
                         .with_for_update().execution_options(populate_existing=True))).scalar_one()
            uploads = []
            total_bytes = 0
            digest = hashlib.sha256()
            digest.update(json.dumps(retained_image_ids, separators=(',', ':')).encode())
            if chapter_update is not None:
                digest.update(chapter_update.model_dump_json(exclude_unset=True).encode())
            for upload in images:
                data = await upload.read(20*1024*1024+1)
                if len(data) > 20*1024*1024:
                    raise HTTPException(413, 'Each chapter image must be at most 20 MB')
                total_bytes += len(data)
                if total_bytes > 50*1024*1024:
                    raise HTTPException(413, 'A chapter image request must be at most 50 MB')
                digest.update(hashlib.sha256(data).digest())
                uploads.append((upload, data))
            request_hash = digest.hexdigest()
            if idempotency_key:
                batch = await db.scalar(select(ChapterUploadBatch).where(ChapterUploadBatch.chapter_id == chapter_id, ChapterUploadBatch.idempotency_key == idempotency_key))
                if batch:
                    if batch.staff_id != staff_id or batch.request_hash != request_hash:
                        raise HTTPException(409, 'Upload idempotency key was already used for different content')
                    return json.loads(batch.response_json)
            existing = {image.id: image for image in chapter.images}
            retained = sorted(chapter.images, key=lambda image: image.order_index)
            if retained_image_ids is not None:
                if any(image_id not in existing for image_id in retained_image_ids):
                    raise HTTPException(422, 'Retained image does not belong to this chapter')
                retained = [existing[image_id] for image_id in retained_image_ids]
            if len(images) + len(retained) > 100:
                raise HTTPException(422, 'A chapter may have at most 100 pages')
            added = []
            added_urls = []
            removed_urls = [image.image_url for image in chapter.images if image not in retained]
            start = len(retained)
            try:
                changes = chapter_update or ChapterUpdateRequest()
                # A new page is a content revision even when the retained IDs are unchanged.
                changes = changes.model_copy(update={'image_ids': [image.id for image in retained]})
                await WebtoonService.apply_chapter_update(db, chapter, changes, len(retained) + len(uploads), can_approve, pages_changed=bool(uploads))
                for order, image in enumerate(retained, 1):
                    image.order_index = order
                for image in chapter.images:
                    if image not in retained:
                        await db.delete(image)
                for order, (upload, data) in enumerate(uploads, start+1):
                    url = await StorageService.upload_file_async(bucket_name=settings.MINIO_BUCKET_CHAPTERS,
                            object_name=f'{chapter.webtoon_id}/{chapter.id}/{order:03d}_{uuid.uuid4().hex}.webp', data=data, content_type=upload.content_type)
                    added_urls.append(url)
                    dimensions = await StorageService.image_dimensions_async(url)
                    image = ChapterImage(chapter_id=chapter.id, image_url=url, order_index=order,
                                         width=dimensions[0] if dimensions else None, height=dimensions[1] if dimensions else None)
                    db.add(image)
                    added.append(image)
                await db.flush()
                added_response = [{'id': image.id, 'image_url': image.image_url, 'order_index': image.order_index, 'width': image.width, 'height': image.height} for image in added]
                response = {'chapter': {'id': chapter.id, 'chapter_number': float(chapter.chapter_number),
                    'title': chapter.title, 'reward_coins': chapter.reward_coins, 'status': chapter.status},
                    'added_images': added_response, 'status_changed_to_pending': chapter._status_changed_to_pending}
                if chapter_update is None:
                    response = added_response
                if idempotency_key:
                    db.add(ChapterUploadBatch(chapter_id=chapter_id, staff_id=staff_id, idempotency_key=idempotency_key, request_hash=request_hash, response_json=json.dumps(response)))
                await db.commit()
            except Exception:
                await db.rollback()
                for url in added_urls:
                    await StorageService.delete_url(url)
                raise
            for url in removed_urls:
                await delete_unreferenced_media(db, url)
            await CacheService.delete_pattern('webtoons:catalog:*')
            return response
