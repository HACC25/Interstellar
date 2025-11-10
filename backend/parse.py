from __future__ import annotations

import io
from typing import Iterable

from fastapi import HTTPException, UploadFile
from pypdf import PdfReader
import docx


class FileParser:
    """Extracts plain text from uploaded documents."""

    async def __call__(self, files: Iterable[UploadFile] | None = None) -> str:
        return await self.parse(files)

    async def parse(self, files: Iterable[UploadFile] | None = None) -> str:
        if not files:
            return ""

        fragments: list[str] = []
        for upload in files:
            if upload is None:
                continue
            fragments.append(await self._parse_file(upload))

        return "\n\n".join(fragment for fragment in fragments if fragment).strip()

    async def _parse_file(self, upload: UploadFile) -> str:
        filename = (upload.filename or "").lower()
        data = await upload.read()
        await upload.seek(0)

        try:
            if filename.endswith(".pdf"):
                return self._parse_pdf(data)
            if filename.endswith(".docx"):
                return self._parse_docx(data)
            if filename.endswith(".txt"):
                return self._parse_txt(data)
        except Exception as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=400, detail=f"Failed to parse {upload.filename}: {exc}"
            ) from exc

        raise HTTPException(
            status_code=400, detail=f"Unsupported file type for {upload.filename}"
        )

    def _parse_pdf(self, data: bytes) -> str:
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text.strip())
        return "\n".join(page for page in pages if page)

    def _parse_docx(self, data: bytes) -> str:
        document = docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in document.paragraphs if p.text).strip()

    def _parse_txt(self, data: bytes) -> str:
        return data.decode("utf-8", errors="ignore").strip()


def get_file_parser() -> FileParser:
    return FileParser()
