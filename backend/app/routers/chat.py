from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.chat import ChatMessage, ChatSession
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ChatSessionCreate,
    ChatSessionRead,
)
from app.services.chat import stream_chat_response

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionRead, status_code=201)
def create_session(
    data: ChatSessionCreate, db: Session = Depends(get_db)
) -> ChatSession:
    session = ChatSession(**data.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageRead])
def get_messages(
    session_id: int, db: Session = Depends(get_db)
) -> list[ChatMessage]:
    session = db.query(ChatSession).get(session_id)
    if not session:
        raise HTTPException(404, "Chat session not found")
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .all()
    )


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    data: ChatMessageCreate,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    session = db.query(ChatSession).get(session_id)
    if not session:
        raise HTTPException(404, "Chat session not found")

    return StreamingResponse(
        stream_chat_response(db, session, data.content),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
