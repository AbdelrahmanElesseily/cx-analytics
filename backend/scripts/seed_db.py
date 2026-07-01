#!/usr/bin/env python
"""
Load real data from Excel files into SQLite.
Run from backend/: python -m scripts.seed_db
"""
import asyncio, re
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import get_settings
from app.db.database import Base
from app.models.tables import Channel, CXStage, Service, Feedback, ImprovementAction

settings = get_settings()
VM_FILE  = "data/Value_Moments.xlsx"
CJ_FILE  = "data/Customer_Journey-Improvement_Plan.xlsx"


def clean(val):
    if pd.isna(val) or val is None:
        return None
    return re.sub(r'\s+', ' ', str(val).replace('\n', ' ')).strip()


def upsert(cache, name, cls, lst):
    key = (name or 'All').strip().lower()
    if key not in cache:
        obj = cls(name=(name or 'All').strip())
        lst.append(obj)
        cache[key] = obj
    return cache[key]


def norm_stage(raw):
    if not raw:
        return 'All'
    s = raw.split('\n')[0].strip()
    m = {
        'service application submission':       'Service Application and Submission',
        'service application and submission':   'Service Application and Submission',
        'communication during procedures':      'Communication During Procedures',
        'receiving service information':        'Receiving Service Information',
        'service completion':                   'Service Completion',
        'all':                                  'All',
    }
    return m.get(s.lower(), s)


def norm_channel(raw):
    if not raw:
        return 'All'
    m = {
        'cc':                        'Contact Centre',
        'branchchc':                 'Branch CHC',
        'vip chc/branch chc':        'VIP CHC / Branch CHC',
        'whatsapp and web chat':     'WhatsApp & Web Chat',
        'website/smart app':         'Website / Smart App',
        'customer happiness center': 'Customer Happiness Center',
        'social media':              'Social Media',
    }
    return m.get(raw.strip().lower(), raw.strip())


def norm_source(raw):
    if not raw:
        return 'Unknown'
    s = re.sub(r'\s+', ' ', raw.replace('\n', ' ')).strip()
    if 'employee' in s.lower() and 'contact center' in s.lower():
        return 'Employee S&F & Contact Center Suggestion'
    return s


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as db:
        ch_cache, st_cache, sv_cache = {}, {}, {}
        new_ch, new_st, new_sv = [], [], []

        # ── Value Moments ─────────────────────────────────────────────────
        vm = pd.read_excel(VM_FILE, sheet_name='2025')
        fb_rows = []
        for _, r in vm.iterrows():
            channel  = norm_channel(clean(r.get('Service')) or 'All')
            cx_stage = norm_stage(clean(r.get('CX Stages')))
            ch  = upsert(ch_cache, channel,       Channel,  new_ch)
            st  = upsert(st_cache, cx_stage,      CXStage,  new_st)
            sv  = upsert(sv_cache, 'All Services', Service,  new_sv)
            fb_rows.append(dict(
                year=2025,
                quarter=clean(r.get('Quarter')),
                source=norm_source(clean(r.get('Source'))),
                value_moment=clean(r.get('Value Moment')),
                details=clean(r.get('Details')),
                value_moment_short=clean(r.get('Value Moment (Short)')),
                rating=int(r.get('HM Rating', 3)) if not pd.isna(r.get('HM Rating', None)) else 3,
                _ch=ch, _st=st, _sv=sv,
            ))

        # ── Improvement Plan ──────────────────────────────────────────────
        cj = pd.read_excel(CJ_FILE, sheet_name='2025')
        im_rows = []
        for _, r in cj.iterrows():
            channel  = norm_channel(clean(r.get('Channel')) or 'All')
            cx_stage = norm_stage(clean(r.get('Customer Journey Stages')))
            service  = clean(r.get('Services')) or 'All Services'
            ch  = upsert(ch_cache, channel,   Channel, new_ch)
            st  = upsert(st_cache, cx_stage,  CXStage, new_st)
            sv  = upsert(sv_cache, service,   Service, new_sv)
            im_rows.append(dict(
                year=2025,
                quarter=clean(r.get('Quarter')),
                source=norm_source(clean(r.get('Source'))),
                problem=clean(r.get('Areas of Improvement')),
                action=clean(r.get('Improvements Actions')),
                _ch=ch, _st=st, _sv=sv,
            ))

        for obj in new_ch + new_st + new_sv:
            db.add(obj)
        await db.flush()

        for r in fb_rows:
            db.add(Feedback(
                year=r['year'], quarter=r['quarter'], source=r['source'],
                service_id=r['_sv'].id, cx_stage_id=r['_st'].id, channel_id=r['_ch'].id,
                value_moment=r['value_moment'], details=r['details'],
                value_moment_short=r['value_moment_short'], rating=r['rating'],
            ))

        for r in im_rows:
            db.add(ImprovementAction(
                year=r['year'], quarter=r['quarter'], source=r['source'],
                channel_id=r['_ch'].id, service_id=r['_sv'].id, cx_stage_id=r['_st'].id,
                problem=r['problem'], action=r['action'],
            ))

        await db.commit()
        print(f"✅ SQLite seeded — {len(fb_rows)} feedback, {len(im_rows)} improvements")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
