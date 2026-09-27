import math
import uuid
from typing import List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from slugify import slugify
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.redis import CacheService
from app.core.storage import StorageService
from app.modules.rewards.models import ReadReward
from app.modules.webtoons.models import Chapter, ChapterImage, Genre, Webtoon
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
        data = [GenreItem.model_validate(g) for g in genres]
        await CacheService.set(cache_key, [d.model_dump() for d in data], expire_seconds=3600)
        return data

    @staticmethod
    async def list_catalog(
        db: AsyncSession,
        page: int = 1,
        limit: int = 20,
        genre_slug: Optional[str] = None,
        status_filter: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> WebtoonCatalogResponse:
        cache_key = f"webtoons:catalog:p{page}:l{limit}:g{genre_slug}:s{status_filter}:q{search_query}"
        cached = await CacheService.get(cache_key)
        if cached:
            return WebtoonCatalogResponse(**cached)

        # Base query
        query = select(Webtoon).options(
            selectinload(Webtoon.genres),
            selectinload(Webtoon.chapters)
        )

        if genre_slug:
            query = query.join(Webtoon.genres).where(Genre.slug == genre_slug)

        if status_filter:
            query = query.where(Webtoon.status == status_filter)

        if search_query:
            search = f"%{search_query.strip()}%"
            query = query.where((Webtoon.title.ilike(search)) | (Webtoon.author_name.ilike(search)))

        # Total count query
        count_stmt = select(func.count(func.distinct(Webtoon.id)))
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
        query = query.order_by(Webtoon.view_count.desc(), Webtoon.created_at.desc()).offset(offset).limit(limit)

        result = await db.execute(query)
        webtoons = result.scalars().unique().all()

        items = []
        for w in webtoons:
            # find latest published chapter
            pub_chapters = [c for c in w.chapters if c.status == "published"]
            latest_ch = None
            if pub_chapters:
                sorted_chs = sorted(pub_chapters, key=lambda c: c.chapter_number, reverse=True)
                latest = sorted_chs[0]
                latest_ch = LatestChapterInfo(
                    id=latest.id,
                    chapter_number=float(latest.chapter_number),
                    created_at=latest.created_at
                )

            items.append(
                WebtoonSummaryItem(
                    id=w.id,
                    title=w.title,
                    slug=w.slug,
                    cover_image_url=w.cover_image_url,
                    author_name=w.author_name,
                    status=w.status,
                    view_count=w.view_count,
                    genres=[g.name for g in w.genres],
                    latest_chapter=latest_ch
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
        user_id: Optional[int] = None
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
                selectinload(Webtoon.chapters)
            )
            .where(cond)
        )
        result = await db.execute(stmt)
        webtoon = result.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        # Increment view count
        webtoon.view_count += 1
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
                created_at=c.created_at
            )
            for c in sorted_pub
        ]

        return WebtoonDetailResponse(
            id=webtoon.id,
            title=webtoon.title,
            slug=webtoon.slug,
            description=webtoon.description,
            cover_image_url=webtoon.cover_image_url,
            author_name=webtoon.author_name,
            status=webtoon.status,
            view_count=webtoon.view_count,
            genres=[g.name for g in webtoon.genres],
            chapters=chapter_items
        )

    @staticmethod
    async def read_chapter(
        db: AsyncSession,
        chapter_id: int,
        user_id: Optional[int] = None
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

        if chapter.status != "published":
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

        # Find prev and next published chapters in this webtoon
        nav_stmt = (
            select(Chapter.id, Chapter.chapter_number)
            .where(Chapter.webtoon_id == chapter.webtoon_id, Chapter.status == "published")
            .order_by(Chapter.chapter_number.asc())
        )
        nav_res = await db.execute(nav_stmt)
        all_published = nav_res.all()

        prev_id = None
        next_id = None
        for i, ch_row in enumerate(all_published):
            if ch_row[0] == chapter.id:
                if i > 0:
                    prev_id = all_published[i - 1][0]
                if i < len(all_published) - 1:
                    next_id = all_published[i + 1][0]
                break

        sorted_images = sorted(chapter.images, key=lambda img: img.order_index)

        return ChapterReaderResponse(
            id=chapter.id,
            webtoon_id=chapter.webtoon_id,
            webtoon_title=chapter.webtoon.title,
            chapter_number=float(chapter.chapter_number),
            title=chapter.title,
            reward_coins=chapter.reward_coins,
            is_reward_claimed=is_claimed,
            images=[ChapterImageItem.model_validate(img) for img in sorted_images],
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
        staff_id: int
    ) -> Webtoon:
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
        content = await cover_file.read()
        cover_url = StorageService.upload_file(
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

        # Invalidate catalog cache
        await CacheService.delete_pattern("webtoons:catalog:*")
        return new_webtoon

    @staticmethod
    async def upload_chapter(
        db: AsyncSession,
        webtoon_id: int,
        chapter_number: float,
        title: Optional[str],
        images: List[UploadFile]
    ) -> Chapter:
        # Check webtoon exists
        w_stmt = select(Webtoon).where(Webtoon.id == webtoon_id)
        w_res = await db.execute(w_stmt)
        webtoon = w_res.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        # Check duplicate chapter number
        dup_stmt = select(Chapter).where(
            Chapter.webtoon_id == webtoon_id,
            Chapter.chapter_number == chapter_number
        )
        dup_res = await db.execute(dup_stmt)
        if dup_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ushbu manhvada {chapter_number} raqamli bob allaqachon mavjud"
            )

        new_chapter = Chapter(
            webtoon_id=webtoon_id,
            chapter_number=chapter_number,
            title=title,
            status="pending",
            reward_coins=settings.CHAPTER_READ_COINS
        )
        db.add(new_chapter)
        await db.flush()

        # Upload images and link
        for idx, img_file in enumerate(images, start=1):
            file_ext = img_file.filename.split(".")[-1].lower() if img_file.filename else "webp"
            object_name = f"{webtoon_id}/{new_chapter.id}/{idx:03d}_{uuid.uuid4().hex[:6]}.{file_ext}"
            content = await img_file.read()
            img_url = StorageService.upload_file(
                bucket_name=settings.MINIO_BUCKET_CHAPTERS,
                object_name=object_name,
                data=content,
                content_type=img_file.content_type or "image/webp"
            )
            ch_img = ChapterImage(
                chapter_id=new_chapter.id,
                image_url=img_url,
                order_index=idx
            )
            db.add(ch_img)

        await db.commit()
        await db.refresh(new_chapter)
        return new_chapter

    @staticmethod
    async def moderate_chapter(
        db: AsyncSession,
        chapter_id: int,
        new_status: str
    ) -> None:
        stmt = select(Chapter).where(Chapter.id == chapter_id)
        result = await db.execute(stmt)
        chapter = result.scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        chapter.status = new_status
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

        if title is not None:
            webtoon.title = title
        if description is not None:
            webtoon.description = description
        if author_name is not None:
            webtoon.author_name = author_name
        if status_val is not None:
            webtoon.status = status_val

        if cover_file is not None and cover_file.filename:
            file_ext = cover_file.filename.split(".")[-1].lower()
            object_name = f"{webtoon.slug}_{uuid.uuid4().hex[:8]}.{file_ext}"
            content = await cover_file.read()
            cover_url = StorageService.upload_file(
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
        await CacheService.delete_pattern("webtoons:catalog:*")
        return webtoon

    @staticmethod
    async def delete_webtoon(db: AsyncSession, webtoon_id: int) -> None:
        stmt = select(Webtoon).where(Webtoon.id == webtoon_id)
        res = await db.execute(stmt)
        webtoon = res.scalar_one_or_none()
        if not webtoon:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manhwa topilmadi")

        await db.delete(webtoon)
        await db.commit()
        await CacheService.delete_pattern("webtoons:catalog:*")

    @staticmethod
    async def create_genre(db: AsyncSession, name: str, slug: Optional[str] = None) -> Genre:
        from slugify import slugify
        clean_name = name.strip()
        final_slug = slug.strip() if slug and slug.strip() else slugify(clean_name)

        # Check unique
        stmt = select(Genre).where((Genre.name == clean_name) | (Genre.slug == final_slug))
        existing = (await db.execute(stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bunday nom yoki slug bilan janr mavjud")

        genre = Genre(name=clean_name, slug=final_slug)
        db.add(genre)
        await db.commit()
        await db.refresh(genre)
        await CacheService.delete("genres:all")
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
                images_count=len(c.images),
                created_at=c.created_at
            )
            for c in chapters
        ]

    @staticmethod
    async def update_chapter(db: AsyncSession, chapter_id: int, data) -> Chapter:
        stmt = select(Chapter).options(selectinload(Chapter.webtoon)).where(Chapter.id == chapter_id)
        chapter = (await db.execute(stmt)).scalar_one_or_none()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bob topilmadi")

        if data.chapter_number is not None:
            chapter.chapter_number = data.chapter_number
        if data.title is not None:
            chapter.title = data.title
        if data.reward_coins is not None:
            chapter.reward_coins = data.reward_coins
        if data.status is not None:
            chapter.status = data.status

        await db.commit()
        await db.refresh(chapter)

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

        await db.delete(chapter)
        await db.commit()

        await CacheService.delete(f"chapters:{chapter_id}:reader")
        if webtoon_slug:
            await CacheService.delete(f"webtoons:{webtoon_slug}")
        await CacheService.delete_pattern("webtoons:catalog:*")

