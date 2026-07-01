from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base
import enum


class QuarterEnum(str, enum.Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class Channel(Base):
    __tablename__ = "channels"
    id:   Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    feedback:     Mapped[list["Feedback"]]          = relationship(back_populates="channel")
    improvements: Mapped[list["ImprovementAction"]] = relationship(back_populates="channel")


class CXStage(Base):
    __tablename__ = "cx_stages"
    id:   Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    feedback:     Mapped[list["Feedback"]]          = relationship(back_populates="cx_stage")
    improvements: Mapped[list["ImprovementAction"]] = relationship(back_populates="cx_stage")


class Service(Base):
    __tablename__ = "services"
    id:   Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    feedback:     Mapped[list["Feedback"]]          = relationship(back_populates="service")
    improvements: Mapped[list["ImprovementAction"]] = relationship(back_populates="service")


class Feedback(Base):
    __tablename__ = "feedback"
    id:                 Mapped[int]      = mapped_column(Integer, primary_key=True)
    year:               Mapped[int]      = mapped_column(Integer, default=2025)
    quarter:            Mapped[str]      = mapped_column(SAEnum(QuarterEnum), nullable=False)
    source:             Mapped[str]      = mapped_column(String(100), nullable=False)
    service_id:         Mapped[int]      = mapped_column(ForeignKey("services.id"))
    cx_stage_id:        Mapped[int]      = mapped_column(ForeignKey("cx_stages.id"))
    channel_id:         Mapped[int]      = mapped_column(ForeignKey("channels.id"))
    value_moment:       Mapped[str]      = mapped_column(String(200), nullable=True)
    details:            Mapped[str]      = mapped_column(Text, nullable=True)
    value_moment_short: Mapped[str]      = mapped_column(String(200), nullable=True)
    rating:             Mapped[int]      = mapped_column(Integer, nullable=False)
    created_at:         Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    service:  Mapped["Service"]  = relationship(back_populates="feedback")
    cx_stage: Mapped["CXStage"] = relationship(back_populates="feedback")
    channel:  Mapped["Channel"] = relationship(back_populates="feedback")


class ImprovementAction(Base):
    __tablename__ = "improvement_actions"
    id:         Mapped[int]      = mapped_column(Integer, primary_key=True)
    year:       Mapped[int]      = mapped_column(Integer, default=2025)
    quarter:    Mapped[str]      = mapped_column(SAEnum(QuarterEnum), nullable=False)
    source:     Mapped[str]      = mapped_column(String(200), nullable=False)
    channel_id: Mapped[int]      = mapped_column(ForeignKey("channels.id"))
    service_id: Mapped[int]      = mapped_column(ForeignKey("services.id"))
    cx_stage_id:Mapped[int]      = mapped_column(ForeignKey("cx_stages.id"))
    problem:    Mapped[str]      = mapped_column(Text, nullable=True)
    action:     Mapped[str]      = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    channel:  Mapped["Channel"] = relationship(back_populates="improvements")
    service:  Mapped["Service"] = relationship(back_populates="improvements")
    cx_stage: Mapped["CXStage"]= relationship(back_populates="improvements")
